import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail, ctaButton } from "../_shared/email-html.ts";

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

    const { competition_id, title, content } = await req.json();
    if (!competition_id || !title) throw new Error("competition_id and title are required");

    // Get competition name
    const { data: comp } = await supabase
      .from("competitions")
      .select("name, slug")
      .eq("id", competition_id)
      .single();

    const compName = comp?.name ?? "Competition";

    // Get all approved contestants for this competition
    const { data: contestants } = await supabase
      .from("contestant_registrations")
      .select("email, full_name")
      .eq("competition_id", competition_id)
      .eq("status", "approved");

    if (!contestants || contestants.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = req.headers.get("origin") || "https://scorz.lovable.app";
    const slug = comp?.slug ?? competition_id;
    let sent = 0;

    // Send individually (Resend free tier: batch not available)
    for (const c of contestants) {
      const body = `
        <h1 style="font-size:22px;margin:0 0 8px;color:#1a1b25;">📢 ${title}</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;">
          Hi ${c.full_name}, there's a new update for <strong style="color:#1a1b25;">${compName}</strong>.
        </p>
        ${content ? `<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;color:#1a1b25;font-size:14px;line-height:1.6;white-space:pre-wrap;">${content}</div>` : ""}
        ${ctaButton("Read Full Update", `${siteUrl}/events/${slug}`)}
      `;

      const html = buildEmail({ preheader: `${compName}: ${title}`, body });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scorz <onboarding@resend.dev>",
          to: [c.email],
          subject: `📢 ${compName} — ${title}`,
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
    console.error("send-competition-update error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
