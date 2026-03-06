import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildEmail, ctaButton } from "../_shared/email-html.ts";

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
      const roleLabel =
        role === "judge" ? "Judge"
        : role === "tabulator" ? "Tabulator"
        : role === "chief_judge" ? "Chief Judge"
        : role === "witness" ? "Witness"
        : role;
      const competitionLabel = competition_name || "a competition";

      const html = buildEmail({
        preheader: `You've been invited as ${roleLabel} for ${competitionLabel}`,
        body: `
          <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">You're Invited</h1>
          <p style="color:#52525b;font-size:15px;line-height:1.6;">
            You've been assigned as <strong style="color:#1a1b25;">${roleLabel}</strong> for
            <strong style="color:#1a1b25;">${competitionLabel}</strong>.
          </p>
          <p style="color:#52525b;font-size:15px;line-height:1.6;">
            Click the button below to sign in and access your dashboard. No password needed — this is a secure one-time link.
          </p>
          ${ctaButton("Sign In to Scorz", magicLinkUrl)}
          <p style="color:#a1a1aa;font-size:12px;word-break:break-all;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${magicLinkUrl}" style="color:#f59e0b;">${magicLinkUrl}</a>
          </p>
        `,
      });

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
          html,
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
