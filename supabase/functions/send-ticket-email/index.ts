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

    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("ticket_id is required");

    // Fetch ticket with sub-event info
    const { data: ticket, error: ticketErr } = await supabase
      .from("event_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    // Fetch sub-event details
    const { data: subEvent } = await supabase
      .from("sub_events")
      .select("name, event_date, start_time, location, ticket_price")
      .eq("id", ticket.sub_event_id)
      .single();

    const eventName = subEvent?.name ?? "Event";
    const eventDate = subEvent?.event_date
      ? new Date(subEvent.event_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBD";
    const eventTime = subEvent?.start_time ?? "";
    const eventLocation = subEvent?.location ?? "";
    const ticketPrice = subEvent?.ticket_price
      ? `$${Number(subEvent.ticket_price).toFixed(2)}`
      : "Free";

    // Generate a QR code URL using a public API (for email embedding)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticket_number)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 4px;">🎟️ Your Ticket</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${ticket.full_name}, here's your ticket for <strong>${eventName}</strong>.
        </p>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <img src="${qrUrl}" alt="Ticket QR Code" width="200" height="200" style="display: block; margin: 0 auto 16px;" />
          <p style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1a1a1a; letter-spacing: 2px; margin: 0;">
            ${ticket.ticket_number}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 4px;">Present this code at check-in</p>
        </div>

        <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #888; width: 120px;">Event</td>
            <td style="padding: 8px 0; font-weight: 600;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Date</td>
            <td style="padding: 8px 0; font-weight: 600;">${eventDate}</td>
          </tr>
          ${eventTime ? `<tr><td style="padding: 8px 0; color: #888;">Time</td><td style="padding: 8px 0; font-weight: 600;">${eventTime}</td></tr>` : ""}
          ${eventLocation ? `<tr><td style="padding: 8px 0; color: #888;">Location</td><td style="padding: 8px 0; font-weight: 600;">${eventLocation}</td></tr>` : ""}
          <tr>
            <td style="padding: 8px 0; color: #888;">Type</td>
            <td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${ticket.ticket_type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Price</td>
            <td style="padding: 8px 0; font-weight: 600;">${ticketPrice}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Attendee</td>
            <td style="padding: 8px 0; font-weight: 600;">${ticket.full_name}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 13px;">— The Scorz Team</p>
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
        to: [ticket.email],
        subject: `🎟️ Your Ticket for ${eventName}`,
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
    console.error("send-ticket-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
