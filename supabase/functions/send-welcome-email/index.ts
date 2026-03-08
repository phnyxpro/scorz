import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, ctaButton } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ROLE_CONFIG: Record<string, { label: string; message: string; cta: string; path: string }> = {
  organizer: {
    label: "Organiser",
    message: "Create your first competition, invite judges, and start scoring — all from your dashboard.",
    cta: "Go to Dashboard",
    path: "/dashboard",
  },
  contestant: {
    label: "Contestant",
    message: "Browse open competitions, register to compete, and track your scores in real time.",
    cta: "Browse Competitions",
    path: "/events",
  },
  judge: {
    label: "Judge",
    message: "Your judging assignments are ready. Access scorecards and submit scores from your dashboard.",
    cta: "Open Judge Dashboard",
    path: "/judge",
  },
  chief_judge: {
    label: "Chief Judge",
    message: "Review scores, manage penalties, and certify results from your chief judge panel.",
    cta: "Open Chief Judge Dashboard",
    path: "/chief-judge",
  },
  tabulator: {
    label: "Tabulator",
    message: "Access score summaries, verify tallies, and certify final results.",
    cta: "Open Tabulator Dashboard",
    path: "/tabulator",
  },
  witness: {
    label: "Witness",
    message: "Observe the scoring process and certify the integrity of the competition.",
    cta: "Open Witness Dashboard",
    path: "/witness",
  },
  audience: {
    label: "Audience Member",
    message: "Follow competitions, vote for your favourites, and stay updated with live results.",
    cta: "Browse Events",
    path: "/events",
  },
};

const DEFAULT_CONFIG = {
  label: "Member",
  message: "Explore competitions, connect with the community, and stay in the loop.",
  cta: "Get Started",
  path: "/dashboard",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");

    // Use anon client for JWT validation (ES256 compatible)
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Service role client for DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_name, primary_role } = await req.json();
    const name = user_name || claimsData.claims.user_metadata?.full_name || "there";
    const config = ROLE_CONFIG[primary_role] || DEFAULT_CONFIG;

    const siteUrl = req.headers.get("origin") || "https://scorz.lovable.app";

    const body = `
      <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Welcome to Scorz, ${name}!</h1>
      <p style="display:inline-block;background-color:#f59e0b;color:#1a1b25;font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;letter-spacing:0.5px;margin-bottom:16px;">${config.label}</p>
      <p style="color:#52525b;font-size:15px;line-height:1.6;">
        ${config.message}
      </p>
      ${ctaButton(config.cta, `${siteUrl}${config.path}`)}
      <p style="color:#a1a1aa;font-size:13px;">
        Need help getting started? Reply to this email or check our guide in the app.
      </p>
    `;

    const html = buildEmail({ preheader: `Welcome to Scorz — let's get started!`, body });

    // Mark welcome_email_sent
    await supabase
      .from("profiles")
      .update({ welcome_email_sent: true } as any)
      .eq("user_id", userId);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Scorz <no-reply@scorz.live>",
        to: [user.email],
        subject: `Welcome to Scorz, ${name}! 🎯`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-welcome-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
