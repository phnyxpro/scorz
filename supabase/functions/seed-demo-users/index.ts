import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
  { email: "organizer@demo.scorz.app", fullName: "Demo Organiser", role: "organizer" },
  { email: "chief_judge@demo.scorz.app", fullName: "Demo Chief Judge", role: "chief_judge" },
  { email: "judge@demo.scorz.app", fullName: "Demo Judge", role: "judge" },
  { email: "tabulator@demo.scorz.app", fullName: "Demo Tabulator", role: "tabulator" },
  { email: "witness@demo.scorz.app", fullName: "Demo Witness", role: "witness" },
  { email: "contestant@demo.scorz.app", fullName: "Demo Contestant", role: "contestant" },
  { email: "audience@demo.scorz.app", fullName: "Demo Audience", role: "audience" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a secret guard to prevent public abuse
    const authHeader = req.headers.get("Authorization");
    const seedSecret = Deno.env.get("SEED_SECRET");
    if (!seedSecret) {
      return new Response(JSON.stringify({ error: "SEED_SECRET not configured — seed endpoint disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!authHeader || authHeader !== `Bearer ${seedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: { email: string; status: string }[] = [];

    for (const demo of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === demo.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        results.push({ email: demo.email, status: "already exists" });
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: demo.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: demo.fullName },
        });

        if (createError) {
          results.push({ email: demo.email, status: `error: ${createError.message}` });
          continue;
        }
        userId = newUser.user.id;
        results.push({ email: demo.email, status: "created" });
      }

      // Ensure role exists
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: demo.role },
          { onConflict: "user_id,role" }
        );

      if (roleError) {
        console.error(`Role error for ${demo.email}:`, roleError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
