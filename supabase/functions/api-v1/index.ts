import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate via x-api-key header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const keyHash = await hashKey(apiKey);
    const { data: keyRow, error: keyErr } = await supabase
      .from("api_keys")
      .select("id, user_id, is_active")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyErr || !keyRow) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Update last_used_at
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api-v1\/?/, "").replace(/\/$/, "");

    // Route: /competitions
    if (path === "competitions" || path === "") {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, slug, status, start_date, end_date, description, created_at")
        .eq("created_by", keyRow.user_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: /registrations?competition_id=xxx
    if (path === "registrations") {
      const compId = url.searchParams.get("competition_id");
      let query = supabase
        .from("contestant_registrations")
        .select("id, full_name, email, status, age_category, created_at, competition_id, sub_event_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (compId) query = query.eq("competition_id", compId);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: /scores?sub_event_id=xxx
    if (path === "scores") {
      const seId = url.searchParams.get("sub_event_id");
      let query = supabase
        .from("judge_scores")
        .select("id, contestant_registration_id, judge_id, final_score, raw_total, time_penalty, is_certified, created_at, sub_event_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (seId) query = query.eq("sub_event_id", seId);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint. Available: /competitions, /registrations, /scores" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
