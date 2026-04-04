import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, detailRow, accentBadge } from "../_shared/email-html.ts";

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

    const { record } = await req.json();
    if (!record) throw new Error("record is required");

    const { event_type, title, description, competition_id, metadata } = record;

    // Get competition name if available
    let competitionName = "";
    if (competition_id) {
      const { data: comp } = await supabase
        .from("competitions")
        .select("name")
        .eq("id", competition_id)
        .single();
      competitionName = comp?.name || "";
    }

    // Get all admin users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_admins" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminIds = adminRoles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", adminIds);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_admin_profiles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = "https://scorz.lovable.app";
    let sent = 0;

    // Format event type for display
    const eventLabel = event_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    for (const p of profiles) {
      if (!p.email) continue;

      const body = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">Activity Alert 🔔</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Hi ${p.full_name || "Admin"}, a new activity has been logged on the platform.
        </p>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
          <p style="margin:0 0 4px;">${accentBadge(eventLabel)}</p>
          <p style="font-size:14px;font-weight:600;color:#1a1b25;margin:8px 0 0;">${title}</p>
        </div>
        <table role="presentation" width="100%" style="font-size:14px;color:#1a1b25;border-collapse:collapse;">
          ${detailRow("Event", eventLabel)}
          ${competitionName ? detailRow("Competition", competitionName) : ""}
          ${description ? detailRow("Details", description) : ""}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center" style="background-color:#1a1b25;border-radius:8px;">
              <a href="${siteUrl}/admin/logs" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                View Audit Logs
              </a>
            </td>
          </tr>
        </table>
      `;

      const html = buildEmail({
        preheader: `${eventLabel}: ${title}`,
        body,
      });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scorz <notifications@scorz.live>",
          to: [p.email],
          subject: `🔔 ${eventLabel} — ${title}`,
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

    console.log(`notify-admin-activity: sent ${sent} emails for event_type=${event_type}`);

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("notify-admin-activity error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
