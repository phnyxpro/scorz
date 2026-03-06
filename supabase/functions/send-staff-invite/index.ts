import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getUser();
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, competition_name, competition_id } = await req.json();

    if (!email || !role || !competition_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let targetUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // Create user if they don't exist
    if (!targetUser) {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      });
      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: "Failed to create user account" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUser = newUser.user;
    }

    // Assign the role if not already assigned
    if (targetUser) {
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("role", role)
        .maybeSingle();

      if (!existingRole) {
        await adminClient.from("user_roles").insert({
          user_id: targetUser.id,
          role,
        });
      }
    }

    // Generate magic link
    const siteUrl = req.headers.get("origin") || "https://scorz.lovable.app";
    let magicLinkUrl = `${siteUrl}/auth`;

    try {
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${siteUrl}/welcome` },
        });

      if (!linkError && linkData?.properties?.action_link) {
        magicLinkUrl = linkData.properties.action_link;
      }
    } catch (e) {
      console.error("Magic link generation failed, using fallback:", e);
    }

    // Send email via Resend
    if (resendApiKey) {
      const roleLabel = role === "judge" ? "Judge" : role === "tabulator" ? "Tabulator" : role === "chief_judge" ? "Chief Judge" : role;
      const competitionLabel = competition_name || "a competition";

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:32px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h2 style="color:#1a1a2e;margin:0;font-size:24px;">You're Invited to Scorz</h2>
    </div>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      You've been assigned as a <strong style="color:#1a1a2e;">${roleLabel}</strong> for <strong style="color:#1a1a2e;">${competitionLabel}</strong>.
    </p>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Click the button below to sign in and access your dashboard. No password needed — this is a secure one-time link.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${magicLinkUrl}" style="display:inline-block;background:hsl(243,75%,59%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Sign In to Scorz
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${magicLinkUrl}" style="color:#6366f1;word-break:break-all;">${magicLinkUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
    <p style="color:#bbb;font-size:11px;text-align:center;">
      Scorz — Competition Scoring Platform
    </p>
  </div>
</body>
</html>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scorz <onboarding@resend.dev>",
          to: [email],
          subject: `You're invited as ${roleLabel} — ${competitionLabel}`,
          html: htmlBody,
        }),
      });

      const resendBody = await resendRes.text();
      if (!resendRes.ok) {
        console.error("Resend error:", resendBody);
      }
    } else {
      console.warn("RESEND_API_KEY not set — skipping email send");
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUser?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-staff-invite error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
