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
    const { sub_event_id, full_name, email, phone } = await req.json();
    if (!sub_event_id || !full_name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sub-event to get price
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: subEvent, error: seErr } = await supabaseAdmin
      .from("sub_events")
      .select("name, ticket_price, ticketing_type, max_tickets")
      .eq("id", sub_event_id)
      .single();

    if (seErr || !subEvent) {
      return new Response(JSON.stringify({ error: "Sub-event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subEvent.ticketing_type !== "paid" || !subEvent.ticket_price) {
      return new Response(JSON.stringify({ error: "This event does not accept paid tickets" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check capacity
    if (subEvent.max_tickets) {
      const { count } = await supabaseAdmin
        .from("event_tickets")
        .select("id", { count: "exact", head: true })
        .eq("sub_event_id", sub_event_id);
      if (count !== null && count >= subEvent.max_tickets) {
        return new Response(JSON.stringify({ error: "This event is sold out" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://scorz.lovable.app";
    const priceInCents = Math.round(subEvent.ticket_price * 100);

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Ticket: ${subEvent.name}` },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { sub_event_id, full_name, email, phone: phone || "" },
      success_url: `${origin}/ticket-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
