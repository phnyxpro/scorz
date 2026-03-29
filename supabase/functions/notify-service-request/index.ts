import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Missing email config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px">
        <div style="background:#1a1a2e;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#f97316;margin:0;font-size:20px">New Service Package Request</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
            <tr><td style="padding:8px 0;font-weight:600;width:160px">Name</td><td style="padding:8px 0">${record.full_name}</td></tr>
            <tr><td style="padding:8px 0;font-weight:600">Email</td><td style="padding:8px 0"><a href="mailto:${record.email}" style="color:#f97316">${record.email}</a></td></tr>
            ${record.phone ? `<tr><td style="padding:8px 0;font-weight:600">Phone</td><td style="padding:8px 0">${record.phone}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:600">Organisation</td><td style="padding:8px 0">${record.organisation}</td></tr>
            <tr><td style="padding:8px 0;font-weight:600">Event Type</td><td style="padding:8px 0">${record.event_type}</td></tr>
            <tr><td style="padding:8px 0;font-weight:600">Expected Contestants</td><td style="padding:8px 0">${record.expected_contestants}</td></tr>
            ${record.preferred_date ? `<tr><td style="padding:8px 0;font-weight:600">Preferred Date(s)</td><td style="padding:8px 0">${record.preferred_date}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:600">Location</td><td style="padding:8px 0">${record.location}</td></tr>
          </table>
          ${record.description ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;font-size:14px;color:#374151"><strong>Description:</strong><br/>${record.description}</div>` : ""}
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">Submitted at ${new Date().toISOString()}</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Scorz <notify@notify.scorz.live>",
        to: ["dev@phnyx.pro"],
        subject: `Service Request: ${record.organisation} — ${record.event_type}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
