import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, ctaButton, detailRow, accentBadge } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { sub_event_id } = await req.json();
    if (!sub_event_id) throw new Error("sub_event_id is required");

    // Get sub-event + level + competition info
    const { data: subEvent } = await supabase
      .from("sub_events")
      .select("name, level_id")
      .eq("id", sub_event_id)
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

    // Get all scores for this sub-event
    const { data: scores } = await supabase
      .from("judge_scores")
      .select("id, is_certified, contestant_registration_id, judge_id, final_score")
      .eq("sub_event_id", sub_event_id);

    if (!scores || scores.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_scores" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify all are actually certified
    const allCertified = scores.every((s) => s.is_certified);
    if (!allCertified) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "not_all_certified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalScorecards = scores.length;
    const uniqueJudges = new Set(scores.map((s) => s.judge_id)).size;
    const uniqueContestants = new Set(scores.map((s) => s.contestant_registration_id)).size;

    // Get organizers: competition creator + users with organizer/admin roles
    const { data: orgRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "organizer"]);

    const organizerIds = new Set<string>();
    organizerIds.add(comp.created_by);
    orgRoles?.forEach((r) => organizerIds.add(r.user_id));

    // Get organizer profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", [...organizerIds]);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_organizers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = "https://scorz.lovable.app";
    let sent = 0;

    for (const p of profiles) {
      if (!p.email) continue;

      const body = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">All Scorecards Certified! ✅</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Hi ${p.full_name || "Organizer"}, every scorecard for <strong style="color:#1a1b25;">${subEvent.name}</strong> in
          <strong style="color:#1a1b25;">${comp.name}</strong> has been certified by all judges.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
          <p style="margin:0 0 4px;">${accentBadge("100% CERTIFIED")}</p>
          <p style="font-size:13px;color:#166534;margin:8px 0 0;">All scorecards are complete and ready for review.</p>
        </div>
        <table role="presentation" width="100%" style="font-size:14px;color:#1a1b25;border-collapse:collapse;">
          ${detailRow("Competition", comp.name)}
          ${detailRow("Level", level.name)}
          ${detailRow("Sub-Event", subEvent.name)}
          ${detailRow("Scorecards", String(totalScorecards))}
          ${detailRow("Judges", String(uniqueJudges))}
          ${detailRow("Contestants", String(uniqueContestants))}
        </table>
        ${ctaButton("View Results", `${siteUrl}/competitions/${level.competition_id}/results`)}
      `;

      const html = buildEmail({ preheader: `All ${totalScorecards} scorecards certified for ${subEvent.name}`, body });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scorz <onboarding@resend.dev>",
          to: [p.email],
          subject: `✅ All Scorecards Certified — ${subEvent.name}`,
          html,
        }),
      });

      if (emailRes.ok) {
        sent++;
      } else {
        const err = await emailRes.text();
        console.error(`Failed to email ${p.email}:`, err);
      }
    }

    console.log(`notify-certification-complete: sent ${sent} emails for sub_event ${sub_event_id}`);

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-certification-complete error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
