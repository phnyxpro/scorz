import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check caller has organizer/admin role
    const { data: hasRole } = await supabase.rpc("has_any_role", {
      _user_id: user.id,
      _roles: ["admin", "organizer"],
    });
    if (!hasRole) throw new Error("Forbidden");

    const { registration_id, status, competition_name } = await req.json();

    if (!registration_id || !status) {
      throw new Error("registration_id and status are required");
    }

    // Fetch contestant details
    const { data: reg, error: regErr } = await supabase
      .from("contestant_registrations")
      .select("full_name, email")
      .eq("id", registration_id)
      .single();

    if (regErr || !reg) throw new Error("Registration not found");

    const isApproved = status === "approved";
    const subject = isApproved
      ? `🎉 Registration Approved – ${competition_name || "Competition"}`
      : `Registration Update – ${competition_name || "Competition"}`;

    const html = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 8px;">Congratulations, ${reg.full_name}!</h1>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your registration for <strong>${competition_name || "the competition"}</strong> has been <strong style="color: #16a34a;">approved</strong>.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            You can now view your profile, check performance schedules, and prepare for the event. Good luck!
          </p>
          <p style="color: #999; font-size: 13px; margin-top: 32px;">— The Scorz Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 8px;">Registration Update</h1>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Hi ${reg.full_name}, unfortunately your registration for <strong>${competition_name || "the competition"}</strong> was <strong style="color: #dc2626;">not approved</strong> at this time.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            If you believe this was in error, please contact the competition organizer for more information.
          </p>
          <p style="color: #999; font-size: 13px; margin-top: 32px;">— The Scorz Team</p>
        </div>
      `;

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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
