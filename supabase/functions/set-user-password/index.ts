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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results = [];
    for (const email of emails) {
      try {
        // Use listUsers with filter to find by email
        const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        
        // Alternative: fetch user directly via REST API
        const url = `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?page=1&per_page=50`;
        const resp = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          },
        });
        const usersData = await resp.json();
        const users = usersData.users || usersData;
        const user = Array.isArray(users) ? users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase()) : null;

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
      } catch (err) {
        results.push({ email, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
