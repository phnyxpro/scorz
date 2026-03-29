import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ credits_total: 0, credits_used: 0, credits_available: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ credits_total: 0, credits_used: 0, credits_available: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    // Sync: check Stripe for completed one-time payments and ensure credits exist
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      // Get completed checkout sessions (one-time payments)
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        status: "complete",
        limit: 100,
      });

      const paymentSessions = sessions.data.filter(s => s.mode === "payment");
      logStep("Found payment sessions", { count: paymentSessions.length });

      // Ensure each session has a corresponding credit row
      for (const session of paymentSessions) {
        const { data: existing } = await supabaseClient
          .from("competition_credits")
          .select("id")
          .eq("stripe_session_id", session.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          // Determine product ID from line items
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          const priceObj = lineItems.data[0]?.price;
          const productId = priceObj?.product as string || "";

          await supabaseClient.from("competition_credits").insert({
            user_id: user.id,
            tier_product_id: productId,
            stripe_session_id: session.id,
            purchased_at: new Date(session.created * 1000).toISOString(),
          });
          logStep("Created credit for session", { sessionId: session.id, productId });
        }
      }
    }

    // Now count credits
    const { data: allCredits } = await supabaseClient
      .from("competition_credits")
      .select("id, used_at, tier_product_id")
      .eq("user_id", user.id);

    const credits = allCredits || [];
    const creditsTotal = credits.length;
    const creditsUsed = credits.filter(c => c.used_at !== null).length;
    const creditsAvailable = creditsTotal - creditsUsed;

    // Determine the "best" tier from purchased credits for display
    const tierPriority: Record<string, number> = {
      "prod_U65G1kKSbu9uDM": 3, // Enterprise
      "prod_U65GjQ5kHCWQRe": 2, // Pro
      "prod_U65F5A4sKTnuVF": 1, // Start
    };
    let bestProductId: string | null = null;
    let bestPriority = 0;
    for (const c of credits) {
      const p = tierPriority[c.tier_product_id] || 0;
      if (p > bestPriority) {
        bestPriority = p;
        bestProductId = c.tier_product_id;
      }
    }

    logStep("Credits summary", { creditsTotal, creditsUsed, creditsAvailable, bestProductId });

    return new Response(
      JSON.stringify({
        subscribed: creditsAvailable > 0,
        product_id: bestProductId,
        credits_total: creditsTotal,
        credits_used: creditsUsed,
        credits_available: creditsAvailable,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
