import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, password } = await req.json();
    if (!emails || !password) {
      return new Response(JSON.stringify({ error: "emails array and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch ALL users with pagination
    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      if (!data.users || data.users.length === 0) break;
      allUsers.push(...data.users);
      if (data.users.length < 1000) break;
      page++;
    }

    const results = [];
    for (const email of emails) {
      const user = allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        results.push({ email, success: false, error: "User not found" });
        continue;
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
      if (updateError) {
        results.push({ email, success: false, error: updateError.message });
      } else {
        results.push({ email, success: true });
      }
    }

    return new Response(JSON.stringify({ results, totalUsers: allUsers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
