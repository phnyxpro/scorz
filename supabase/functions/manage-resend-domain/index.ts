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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, domain_id } = await req.json();
    const baseUrl = "https://api.resend.com";
    const headers = {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    };

    let result;

    switch (action) {
      case "add": {
        const res = await fetch(`${baseUrl}/domains`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: "notify.scorz.live" }),
        });
        result = await res.json();
        break;
      }
      case "list": {
        const res = await fetch(`${baseUrl}/domains`, { headers });
        result = await res.json();
        break;
      }
      case "verify": {
        if (!domain_id) throw new Error("domain_id required for verify");
        const res = await fetch(`${baseUrl}/domains/${domain_id}/verify`, {
          method: "POST",
          headers,
        });
        result = await res.json();
        break;
      }
      case "get": {
        if (!domain_id) throw new Error("domain_id required for get");
        const res = await fetch(`${baseUrl}/domains/${domain_id}`, { headers });
        result = await res.json();
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[manage-resend-domain] ${action}:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
