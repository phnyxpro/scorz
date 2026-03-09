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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results = [];
    for (const email of emails) {
      try {
        // Use GoTrue admin API directly to find user by email
        const searchUrl = `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`;
        // Actually, let's use the admin client but handle the error
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        // Find user page by page
        let foundUser: any = null;
        let page = 1;
        while (!foundUser) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
          if (error) {
            console.error(`listUsers error page ${page}:`, error.message);
            break;
          }
          if (!data.users || data.users.length === 0) break;
          foundUser = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (data.users.length < 50) break;
          page++;
        }

        if (!foundUser) {
          results.push({ email, success: false, error: "User not found" });
          continue;
        }

        const supabaseAdmin2 = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { error: updateError } = await supabaseAdmin2.auth.admin.updateUserById(foundUser.id, { password });
        if (updateError) {
          results.push({ email, success: false, error: updateError.message });
        } else {
          results.push({ email, success: true });
        }
      } catch (err) {
        console.error(`Error for ${email}:`, err);
        results.push({ email, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Top-level error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
