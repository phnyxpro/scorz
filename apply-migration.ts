import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log("Applying migration...");
    
    // Try to add the columns if they don't exist
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE public.sub_events
        ADD COLUMN IF NOT EXISTS timer_visible boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS comments_visible boolean NOT NULL DEFAULT true;
      `,
    });

    if (error) {
      console.error("Migration error:", error);
      // If RPC doesn't work, try alternative approach
      console.log("Note: If the above failed, please run this SQL in your Supabase dashboard:");
      console.log(`
ALTER TABLE public.sub_events
ADD COLUMN IF NOT EXISTS timer_visible boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS comments_visible boolean NOT NULL DEFAULT true;
      `);
    } else {
      console.log("Migration applied successfully!");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

applyMigration();