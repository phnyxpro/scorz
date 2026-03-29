import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, ctaButton, accentBadge } from "../_shared/email-html.ts";

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

    const { data: hasRole } = await supabase.rpc("has_any_role", {
      _user_id: user.id,
      _roles: ["admin", "organizer"],
    });
    if (!hasRole) throw new Error("Forbidden");

    const { registration_id, status, competition_name } = await req.json();
    if (!registration_id || !status) throw new Error("registration_id and status are required");

    const { data: reg, error: regErr } = await supabase
      .from("contestant_registrations")
      .select("full_name, email")
      .eq("id", registration_id)
      .single();
    if (regErr || !reg) throw new Error("Registration not found");

    const isApproved = status === "approved";
    const compName = competition_name || "the competition";
    const subject = isApproved
      ? `🎉 Registration Approved – ${compName}`
      : `Registration Update – ${compName}`;

    const body = isApproved
      ? `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Congratulations, ${reg.full_name}!</h1>
        <p style="margin-bottom:16px;">${accentBadge("APPROVED")}</p>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Your registration for <strong style="color:#1a1b25;">${compName}</strong> has been approved.
        </p>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          You can now view your profile, check performance schedules, and prepare for the event. Good luck!
        </p>
        ${ctaButton("View Your Profile", "https://scorz.lovable.app/contestant/profile")}
      `
      : `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Registration Update</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Hi ${reg.full_name}, unfortunately your registration for <strong style="color:#1a1b25;">${compName}</strong> was <strong style="color:#dc2626;">not approved</strong> at this time.
        </p>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          If you believe this was in error, please contact the competition organiser for more information.
        </p>
      `;

    const html = buildEmail({ preheader: isApproved ? "Your registration has been approved!" : "Registration status update", body });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Scorz <onboarding@resend.dev>",
        to: [reg.email],
        subject,
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
    console.error("notify-registration-status error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
