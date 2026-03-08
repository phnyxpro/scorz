import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sub_event_id, full_name, email, phone } = session.metadata || {};
    if (!sub_event_id || !full_name || !email) {
      return new Response(JSON.stringify({ error: "Invalid session metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Check if ticket already created for this session (idempotent)
    const { data: existing } = await supabaseAdmin
      .from("event_tickets")
      .select("ticket_number")
      .eq("payment_status", session_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ticket_number: existing.ticket_number }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const ticket_number = `TKT-${Date.now().toString(36).toUpperCase()}`;

    const { error: insertErr } = await supabaseAdmin.from("event_tickets").insert({
      sub_event_id,
      full_name,
      email,
      phone: phone || null,
      ticket_number,
      ticket_type: "paid",
      payment_status: session_id,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send ticket email
    try {
      const { data: ticketRow } = await supabaseAdmin
        .from("event_tickets")
        .select("id")
        .eq("ticket_number", ticket_number)
        .single();
      if (ticketRow) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ ticket_id: ticketRow.id }),
        });
      }
    } catch {
      // Non-blocking
    }

    return new Response(JSON.stringify({ ticket_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
