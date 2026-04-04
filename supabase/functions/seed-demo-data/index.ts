import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "demo1234";
const DEMO_SLUG = "fcnps-2025";

const DEMO_USERS = [
  { email: "organizer@demo.scorz.app", fullName: "Demo Organiser", role: "organizer" },
  { email: "chief_judge@demo.scorz.app", fullName: "Demo Chief Judge", role: "chief_judge" },
  { email: "judge@demo.scorz.app", fullName: "Demo Judge", role: "judge" },
  { email: "tabulator@demo.scorz.app", fullName: "Demo Tabulator", role: "tabulator" },
  { email: "witness@demo.scorz.app", fullName: "Demo Witness", role: "witness" },
  { email: "contestant@demo.scorz.app", fullName: "Demo Contestant", role: "contestant" },
  { email: "audience@demo.scorz.app", fullName: "Demo Audience", role: "audience" },
];

const EXTRA_CONTESTANTS = [
  { email: "contestant2@demo.scorz.app", fullName: "Maya Johnson", age: "adult", location: "Brooklyn, NY", bio: "Brooklyn-based spoken word artist who blends jazz rhythms with social commentary. Three-time NYC borough champion." },
  { email: "contestant3@demo.scorz.app", fullName: "Carlos Rivera", age: "adult", location: "Miami, FL", bio: "Bilingual poet weaving English and Spanish to explore identity, immigration, and resilience. Featured on Button Poetry." },
  { email: "contestant4@demo.scorz.app", fullName: "Aisha Patel", age: "young_adult", location: "Chicago, IL", bio: "Youth slam champion from Chicago's Louder Than A Bomb. Writes about mental health, heritage, and growing up between cultures." },
  { email: "contestant5@demo.scorz.app", fullName: "Jordan Lee", age: "adult", location: "Atlanta, GA", bio: "Southern storyteller blending narrative poetry with humor. Winner of multiple regional slams across the Southeast." },
];

const RUBRIC = [
  {
    name: "Content & Meaning",
    sort_order: 0,
    description_1: "Content is unclear, lacks focus, or feels undeveloped. No discernible message.",
    description_2: "Some ideas present but lack cohesion or depth. Message is vague.",
    description_3: "Content has a clear message with moderate depth. Some memorable moments.",
    description_4: "Strong thematic content with layered meaning. Engages the mind.",
    description_5: "Exceptional depth and originality. Content is profound, memorable, and transformative.",
  },
  {
    name: "Vocal Delivery",
    sort_order: 1,
    description_1: "Monotone or inaudible. Pacing is erratic. Little vocal variation.",
    description_2: "Some variation but inconsistent. Occasional mumbling or rushing.",
    description_3: "Clear and audible with decent pacing. Some effective vocal choices.",
    description_4: "Dynamic range with purposeful pacing, tone shifts, and emphasis.",
    description_5: "Masterful vocal control. Every pause, whisper, and crescendo serves the poem.",
  },
  {
    name: "Stage Presence",
    sort_order: 2,
    description_1: "Appears uncomfortable or disengaged. Little eye contact or movement.",
    description_2: "Some awareness of audience but mostly static or nervous.",
    description_3: "Comfortable on stage with appropriate gestures and eye contact.",
    description_4: "Commanding presence. Fills the space and connects with the room.",
    description_5: "Magnetic. Owns the stage completely. Audience is captivated from start to finish.",
  },
  {
    name: "Originality",
    sort_order: 3,
    description_1: "Relies heavily on clichés or derivative ideas. Nothing feels fresh.",
    description_2: "Some original moments but largely predictable themes or language.",
    description_3: "Shows personal voice with some unique imagery or perspective.",
    description_4: "Distinctive voice and fresh approach. Avoids predictable territory.",
    description_5: "Truly innovative. Pushes boundaries with unique language, form, or perspective.",
  },
  {
    name: "Audience Connection",
    sort_order: 4,
    description_1: "No discernible connection with the audience. Performance feels isolated.",
    description_2: "Occasional moments of connection but mostly self-contained.",
    description_3: "Engages the audience at times. Some emotional response evoked.",
    description_4: "Strong rapport with audience. Evokes genuine emotional reactions.",
    description_5: "Electric connection. The audience is fully invested. Collective experience is palpable.",
  },
];

async function ensureUser(supabaseAdmin: any, email: string, fullName: string, role: string) {
  let userId: string;

  // Try to create first; if already exists, fetch by creating with same email will error
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    // User already exists — look up from profiles table
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (!profile) throw new Error(`Cannot find existing user ${email}`);
    userId = profile.user_id;
  } else {
    userId = newUser.user.id;
  }

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

  return userId;
}

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

    // 1. Check idempotency
    const { data: existingComp } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("slug", DEMO_SLUG)
      .maybeSingle();

    if (existingComp) {
      return new Response(JSON.stringify({
        success: true,
        message: "Demo competition already exists",
        competition_id: existingComp.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Ensure all demo users
    const userIds: Record<string, string> = {};
    for (const u of DEMO_USERS) {
      userIds[u.role] = await ensureUser(supabaseAdmin, u.email, u.fullName, u.role);
    }

    // 3. Ensure extra contestants
    const contestantIds: string[] = [userIds.contestant];
    for (const c of EXTRA_CONTESTANTS) {
      const id = await ensureUser(supabaseAdmin, c.email, c.fullName, "contestant");
      contestantIds.push(id);
    }

    // 4. Create competition
    const { data: comp, error: compErr } = await supabaseAdmin
      .from("competitions")
      .insert({
        name: "FCNPS National Poetry Slam 2025",
        slug: DEMO_SLUG,
        status: "active",
        description: "The premier national poetry slam competition featuring the best spoken word artists from across the country. Three electrifying rounds of raw, unfiltered poetry.",
        start_date: "2025-07-15",
        end_date: "2025-07-17",
        created_by: userIds.organizer,
        voting_enabled: true,
      })
      .select("id")
      .single();

    if (compErr) throw new Error(`Competition: ${compErr.message}`);
    const compId = comp.id;

    // 5. Create levels
    const levelNames = ["Auditions", "Semi-Finals", "Finals"];
    const levelIds: string[] = [];
    for (let i = 0; i < levelNames.length; i++) {
      const { data: lvl, error } = await supabaseAdmin
        .from("competition_levels")
        .insert({ competition_id: compId, name: levelNames[i], sort_order: i })
        .select("id")
        .single();
      if (error) throw new Error(`Level ${levelNames[i]}: ${error.message}`);
      levelIds.push(lvl.id);
    }

    // 6. Create sub-events
    const subEventConfigs = [
      { name: "Auditions – Main Stage", location: "Grand Ballroom A", event_date: "2025-07-15", start_time: "10:00", end_time: "17:00" },
      { name: "Semi-Finals – Evening Show", location: "Grand Ballroom B", event_date: "2025-07-16", start_time: "18:00", end_time: "22:00" },
      { name: "Finals – Championship Night", location: "Main Theater", event_date: "2025-07-17", start_time: "19:00", end_time: "23:00" },
    ];
    const subEventIds: string[] = [];
    for (let i = 0; i < subEventConfigs.length; i++) {
      const { data: se, error } = await supabaseAdmin
        .from("sub_events")
        .insert({ level_id: levelIds[i], ...subEventConfigs[i], status: "scheduled" })
        .select("id")
        .single();
      if (error) throw new Error(`SubEvent ${i}: ${error.message}`);
      subEventIds.push(se.id);
    }

    // 7. Create rubric criteria
    for (const r of RUBRIC) {
      const { error } = await supabaseAdmin
        .from("rubric_criteria")
        .insert({ competition_id: compId, ...r });
      if (error) throw new Error(`Rubric ${r.name}: ${error.message}`);
    }

    // 8. Create penalty rules
    const penalties = [
      { from_seconds: 0, to_seconds: 10, penalty_points: 0.5, sort_order: 0 },
      { from_seconds: 10, to_seconds: 20, penalty_points: 1.0, sort_order: 1 },
      { from_seconds: 20, to_seconds: null, penalty_points: 2.0, sort_order: 2 },
    ];
    for (const p of penalties) {
      const { error } = await supabaseAdmin
        .from("penalty_rules")
        .insert({
          competition_id: compId,
          time_limit_seconds: 180,
          grace_period_seconds: 10,
          ...p,
        });
      if (error) throw new Error(`Penalty: ${error.message}`);
    }

    // 9. Register contestants (all assigned to Auditions sub-event)
    const contestantData = [
      { fullName: "Demo Contestant", email: "contestant@demo.scorz.app", age: "adult", location: "Washington, DC", bio: "Passionate poet exploring themes of identity and belonging through vivid imagery and heartfelt narratives." },
      ...EXTRA_CONTESTANTS.map((c) => ({ fullName: c.fullName, email: c.email, age: c.age, location: c.location, bio: c.bio })),
    ];
    const registrationIds: string[] = [];
    for (let i = 0; i < contestantIds.length; i++) {
      const { data: reg, error } = await supabaseAdmin
        .from("contestant_registrations")
        .insert({
          competition_id: compId,
          user_id: contestantIds[i],
          full_name: contestantData[i].fullName,
          email: contestantData[i].email,
          age_category: contestantData[i].age,
          location: contestantData[i].location,
          bio: contestantData[i].bio,
          status: "approved",
          sub_event_id: subEventIds[0],
          sort_order: i,
          rules_acknowledged: true,
          rules_acknowledged_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(`Registration ${i}: ${error.message}`);
      registrationIds.push(reg.id);
    }

    // 10. Create sub-event assignments
    const assignmentRoles = [
      { userId: userIds.judge, role: "judge", is_chief: false },
      { userId: userIds.chief_judge, role: "judge", is_chief: true },
      { userId: userIds.tabulator, role: "tabulator", is_chief: false },
      { userId: userIds.witness, role: "witness", is_chief: false },
    ];
    for (const seId of subEventIds) {
      for (const a of assignmentRoles) {
        const { error } = await supabaseAdmin
          .from("sub_event_assignments")
          .insert({ sub_event_id: seId, user_id: a.userId, role: a.role, is_chief: a.is_chief });
        if (error) console.error(`Assignment error: ${error.message}`);
      }
    }

    // 11. Create sample scores for Round 1 (3 of 5 contestants)
    const sampleScores = [
      {
        registrationIdx: 0,
        criterion_scores: { 0: 4.5, 1: 4.0, 2: 4.5, 3: 4.0, 4: 5.0 },
        raw_total: 22.0,
        final_score: 22.0,
        duration: 165,
        comments: "Powerful opening. Strong emotional arc throughout.",
      },
      {
        registrationIdx: 1,
        criterion_scores: { 0: 4.0, 1: 4.5, 2: 3.5, 3: 4.0, 4: 4.0 },
        raw_total: 20.0,
        final_score: 20.0,
        duration: 172,
        comments: "Excellent vocal dynamics. Could push stage presence further.",
      },
      {
        registrationIdx: 2,
        criterion_scores: { 0: 3.5, 1: 4.0, 2: 3.5, 3: 4.0, 4: 3.5 },
        raw_total: 18.5,
        final_score: 18.5,
        duration: 178,
        comments: "Solid bilingual piece. Crowd responded well to the Spanish verses.",
      },
    ];

    for (const s of sampleScores) {
      const { error } = await supabaseAdmin
        .from("judge_scores")
        .insert({
          sub_event_id: subEventIds[0],
          judge_id: userIds.judge,
          contestant_registration_id: registrationIds[s.registrationIdx],
          criterion_scores: s.criterion_scores,
          raw_total: s.raw_total,
          final_score: s.final_score,
          time_penalty: 0,
          performance_duration_seconds: s.duration,
          comments: s.comments,
        });
      if (error) console.error(`Score error: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Demo competition seeded successfully",
      competition_id: compId,
      levels: levelIds.length,
      sub_events: subEventIds.length,
      contestants: registrationIds.length,
      scores: sampleScores.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
