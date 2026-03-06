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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Only chief judges / admins / organizers can trigger this
    const { data: hasRole } = await supabase.rpc("has_any_role", {
      _user_id: user.id,
      _roles: ["admin", "organizer", "chief_judge"],
    });
    if (!hasRole) throw new Error("Forbidden");

    const { sub_event_id } = await req.json();
    if (!sub_event_id) throw new Error("sub_event_id is required");

    // Get sub-event name
    const { data: subEvent } = await supabase
      .from("sub_events")
      .select("name, level_id")
      .eq("id", sub_event_id)
      .single();

    const eventName = subEvent?.name ?? "Event";

    // Get all scores for this sub-event
    const { data: scores } = await supabase
      .from("judge_scores")
      .select("contestant_registration_id, final_score")
      .eq("sub_event_id", sub_event_id);

    if (!scores || scores.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group scores by contestant and calculate average
    const contestantScores: Record<string, number[]> = {};
    for (const s of scores) {
      if (!contestantScores[s.contestant_registration_id]) {
        contestantScores[s.contestant_registration_id] = [];
      }
      contestantScores[s.contestant_registration_id].push(Number(s.final_score));
    }

    // Get contestant details
    const contestantIds = Object.keys(contestantScores);
    const { data: contestants } = await supabase
      .from("contestant_registrations")
      .select("id, full_name, email")
      .in("id", contestantIds);

    if (!contestants) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = req.headers.get("origin") || "https://scorz.lovable.app";
    let sent = 0;

    for (const c of contestants) {
      const cScores = contestantScores[c.id];
      const avg = (cScores.reduce((a, b) => a + b, 0) / cScores.length).toFixed(2);

      const body = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Scores Certified! 🏆</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Hi ${c.full_name}, your scores for <strong style="color:#1a1b25;">${eventName}</strong> have been officially certified by the Chief Judge.
        </p>
        <div style="background:#f8f9fa;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Average Score</p>
          <p style="font-size:36px;font-weight:800;color:#1a1b25;margin:0;">${avg}</p>
          <p style="margin-top:8px;">${accentBadge("CERTIFIED")}</p>
        </div>
        <table role="presentation" width="100%" style="font-size:14px;color:#1a1b25;border-collapse:collapse;">
          ${detailRow("Event", eventName)}
          ${detailRow("Judges", String(cScores.length))}
        </table>
        ${ctaButton("View Your Scorecard", `${siteUrl}/contestant/feedback`)}
      `;

      const html = buildEmail({ preheader: `Your scores for ${eventName} are in!`, body });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scorz <onboarding@resend.dev>",
          to: [c.email],
          subject: `🏆 Scores Certified — ${eventName}`,
          html,
        }),
      });

      if (emailRes.ok) sent++;
      else {
        const err = await emailRes.text();
        console.error(`Failed to email ${c.email}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-score-alert error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
