
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspect() {
  const competitionId = "3a212bca-40f7-481f-ab67-9ce5e5223eb5"; // SPARK
  
  // 1. Get levels
  const { data: levels } = await supabase.from('competition_levels').select('id, name').eq('competition_id', competitionId);
  console.log("Levels:", levels?.map(l => `${l.name} (${l.id})`));
  
  // 2. Get categories for those levels
  const levelIds = levels?.map(l => l.id) || [];
  const { data: categories } = await supabase.from('competition_categories').select('id, name, level_id').in('level_id', levelIds);
  console.log("Categories count:", categories?.length);
  console.log("Sample Categories:", categories?.slice(0, 5).map(c => `${c.name} (${c.id})`));
  
  // 3. Get first registration's custom fields
  const { data: regs } = await supabase.from('contestant_registrations').select('id, full_name, custom_field_values').eq('competition_id', competitionId).limit(5);
  for (const r of regs || []) {
    console.log(`Registration: ${r.full_name}`);
    console.log(`Values:`, JSON.stringify(r.custom_field_values, null, 2));
  }
}

inspect();
