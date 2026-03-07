import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, ctaButton, detailRow, accentBadge } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EventPayload {
  type: "scoring_started" | "judge_certified" | "all_certified";
  sub_event_id: string;
  judge_id?: string;
}

async function resolveContext(supabase: any, subEventId: string) {
  const { data: subEvent } = await supabase
    .from("sub_events")
    .select("name, level_id")
    .eq("id", subEventId)
    .single();
  if (!subEvent) throw new Error("Sub-event not found");

  const { data: level } = await supabase
    .from("competition_levels")
    .select("name, competition_id")
    .eq("id", subEvent.level_id)
    .single();
  if (!level) throw new Error("Level not found");

  const { data: comp } = await supabase
    .from("competitions")
    .select("name, created_by")
    .eq("id", level.competition_id)
    .single();
  if (!comp) throw new Error("Competition not found");

  return { subEvent, level, comp, competitionId: level.competition_id };
}

async function getRecipients(supabase: any, createdBy: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "organizer", "tabulator"]);

  const recipientIds = new Set<string>();
  recipientIds.add(createdBy);
  roles?.forEach((r: any) => recipientIds.add(r.user_id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", [...recipientIds]);

  return profiles || [];
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Scorz <notify@notify.scorz.live>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error(`Email to ${to} failed:`, await res.text());
    return false;
  }
  return true;
}

async function insertNotifications(supabase: any, recipients: any[], title: string, message: string, link: string, type = "info") {
  const rows = recipients
    .filter((p: any) => p.user_id)
    .map((p: any) => ({
      user_id: p.user_id,
      title,
      message,
      type,
      link,
    }));
  if (rows.length) {
    await supabase.from("notifications").insert(rows);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { type, sub_event_id, judge_id } = (await req.json()) as EventPayload;
    if (!type || !sub_event_id) throw new Error("type and sub_event_id required");

    const { subEvent, level, comp, competitionId } = await resolveContext(supabase, sub_event_id);
    const recipients = await getRecipients(supabase, comp.created_by);
    const siteUrl = "https://scorz.lovable.app";
    let sent = 0;

    if (type === "scoring_started") {
      const notifTitle = "Scoring Started";
      const notifMsg = `Scoring has begun for ${subEvent.name} in ${comp.name}`;
      const link = `/competitions/${competitionId}`;

      await insertNotifications(supabase, recipients, notifTitle, notifMsg, link, "info");

      const emailBody = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Scoring Has Started 🎬</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          The first scores have been submitted for <strong style="color:#1a1b25;">${subEvent.name}</strong> in
          <strong style="color:#1a1b25;">${comp.name}</strong>.
        </p>
        <table role="presentation" width="100%" style="font-size:14px;color:#1a1b25;border-collapse:collapse;">
          ${detailRow("Competition", comp.name)}
          ${detailRow("Level", level.name)}
          ${detailRow("Sub-Event", subEvent.name)}
        </table>
        ${ctaButton("View Competition", `${siteUrl}/competitions/${competitionId}`)}
      `;
      const html = buildEmail({ preheader: `Scoring started for ${subEvent.name}`, body: emailBody });

      for (const p of recipients) {
        if (p.email && await sendEmail(RESEND_API_KEY, p.email, `🎬 Scoring Started — ${subEvent.name}`, html)) sent++;
      }

      await supabase.from("activity_log").insert({
        competition_id: competitionId,
        sub_event_id,
        event_type: "scoring_started",
        title: "Scoring Started",
        description: `Scoring began for ${subEvent.name}. ${sent} notification(s) sent.`,
      });
    }

    if (type === "judge_certified") {
      // Get judge profile
      let judgeName = "A judge";
      if (judge_id) {
        const { data: judgeProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", judge_id)
          .single();
        if (judgeProfile?.full_name) judgeName = judgeProfile.full_name;
      }

      const notifTitle = "Judge Certified";
      const notifMsg = `${judgeName} has certified all scores for ${subEvent.name}`;
      const link = `/competitions/${competitionId}`;

      await insertNotifications(supabase, recipients, notifTitle, notifMsg, link, "success");

      const emailBody = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Judge Certified ✍️</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          <strong style="color:#1a1b25;">${judgeName}</strong> has certified all their scores for
          <strong style="color:#1a1b25;">${subEvent.name}</strong> in <strong style="color:#1a1b25;">${comp.name}</strong>.
        </p>
        <table role="presentation" width="100%" style="font-size:14px;color:#1a1b25;border-collapse:collapse;">
          ${detailRow("Judge", judgeName)}
          ${detailRow("Competition", comp.name)}
          ${detailRow("Level", level.name)}
          ${detailRow("Sub-Event", subEvent.name)}
        </table>
        ${ctaButton("View Competition", `${siteUrl}/competitions/${competitionId}`)}
      `;
      const html = buildEmail({ preheader: `${judgeName} certified for ${subEvent.name}`, body: emailBody });

      for (const p of recipients) {
        if (p.email && await sendEmail(RESEND_API_KEY, p.email, `✍️ Judge Certified — ${judgeName} for ${subEvent.name}`, html)) sent++;
      }

      await supabase.from("activity_log").insert({
        competition_id: competitionId,
        sub_event_id,
        event_type: "judge_certified",
        title: `Judge Certified — ${judgeName}`,
        description: `${judgeName} certified scores for ${subEvent.name}. ${sent} notification(s) sent.`,
        actor_id: judge_id || null,
      });

      // Check if ALL judges are now certified
      const { data: allScores } = await supabase
        .from("judge_scores")
        .select("id, is_certified")
        .eq("sub_event_id", sub_event_id);

      if (allScores && allScores.length > 0 && allScores.every((s: any) => s.is_certified)) {
        // Fire all_certified internally
        const allCertNotifTitle = "All Scores Certified";
        const allCertNotifMsg = `All judges have certified their scores for ${subEvent.name} in ${comp.name}`;
        await insertNotifications(supabase, recipients, allCertNotifTitle, allCertNotifMsg, `/competitions/${competitionId}/results`, "success");

        // The existing notify-certification-complete trigger handles the email for this case
      }
    }

    if (type === "all_certified") {
      // This can also be called directly if needed
      const notifTitle = "All Scores Certified";
      const notifMsg = `All judges have certified scores for ${subEvent.name} in ${comp.name}. Results are ready!`;
      const link = `/competitions/${competitionId}/results`;

      await insertNotifications(supabase, recipients, notifTitle, notifMsg, link, "success");
      // Email is handled by the existing notify-certification-complete function
    }

    console.log(`notify-scoring-events [${type}]: sent ${sent} emails for sub_event ${sub_event_id}`);

    return new Response(JSON.stringify({ success: true, sent, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-scoring-events error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
