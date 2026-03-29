import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: hasRole } = await supabase.rpc("has_any_role", {
      _user_id: user.id,
      _roles: ["admin", "organizer"],
    });
    if (!hasRole) throw new Error("Forbidden: admin or organizer role required");

    const { competition_id, subject, content, recipient_groups, extra_emails } = await req.json();
    if (!competition_id || !subject || !content) {
      throw new Error("competition_id, subject, and content are required");
    }

    const groups: string[] = recipient_groups || [];
    const custom: string[] = extra_emails || [];

    // Get competition info
    const { data: comp } = await supabase
      .from("competitions")
      .select("name, slug")
      .eq("id", competition_id)
      .single();
    const compName = comp?.name ?? "Competition";

    // Collect emails per group
    const emailSet = new Set<string>();

    // Organisers (admin + organizer roles)
    if (groups.includes("organisers")) {
      const { data: orgRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "organizer"]);
      if (orgRoles?.length) {
        const userIds = orgRoles.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("user_id", userIds);
        profiles?.forEach((p: any) => { if (p.email) emailSet.add(p.email.toLowerCase()); });
      }
    }

    // Judges & Tabulators — from sub_event_assignments for this competition
    if (groups.includes("judges") || groups.includes("tabulators")) {
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competition_id);
      if (levels?.length) {
        const { data: subEvents } = await supabase
          .from("sub_events")
          .select("id")
          .in("level_id", levels.map((l: any) => l.id));
        if (subEvents?.length) {
          const wantedRoles: string[] = [];
          if (groups.includes("judges")) wantedRoles.push("judge");
          if (groups.includes("tabulators")) wantedRoles.push("tabulator");

          const { data: assignments } = await supabase
            .from("sub_event_assignments")
            .select("user_id, role")
            .in("sub_event_id", subEvents.map((se: any) => se.id))
            .in("role", wantedRoles);
          if (assignments?.length) {
            const userIds = [...new Set(assignments.map((a: any) => a.user_id))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("email")
              .in("user_id", userIds);
            profiles?.forEach((p: any) => { if (p.email) emailSet.add(p.email.toLowerCase()); });
          }
        }
      }
    }

    // Contestants
    if (groups.includes("contestants")) {
      const { data: contestants } = await supabase
        .from("contestant_registrations")
        .select("email")
        .eq("competition_id", competition_id)
        .eq("status", "approved");
      contestants?.forEach((c: any) => { if (c.email) emailSet.add(c.email.toLowerCase()); });
    }

    // Audience (tickets)
    if (groups.includes("audience")) {
      const { data: levels } = await supabase
        .from("competition_levels")
        .select("id")
        .eq("competition_id", competition_id);
      if (levels?.length) {
        const { data: subEvents } = await supabase
          .from("sub_events")
          .select("id")
          .in("level_id", levels.map((l: any) => l.id));
        if (subEvents?.length) {
          const { data: tickets } = await supabase
            .from("event_tickets")
            .select("email")
            .in("sub_event_id", subEvents.map((se: any) => se.id));
          tickets?.forEach((t: any) => { if (t.email) emailSet.add(t.email.toLowerCase()); });
        }
      }
    }

    // Custom emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const e of custom) {
      const trimmed = e.trim().toLowerCase();
      if (trimmed && emailRegex.test(trimmed)) {
        emailSet.add(trimmed);
      }
    }

    const allEmails = [...emailSet];
    if (allEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No recipients found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build branded email
    const emailHtml = buildEmail({
      subject,
      preheader: `${subject} — ${compName}`,
      body: `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1b25;">${subject}</h2>
        <p style="margin:0 0 8px;font-size:13px;color:#71717a;">From: ${compName}</p>
        <div style="margin:16px 0;padding:16px;background-color:#f9fafb;border-radius:8px;font-size:15px;line-height:1.6;color:#1a1b25;">
          ${content}
        </div>
      `,
    });

    // Send emails in batches of 10
    let sentCount = 0;
    const batchSize = 10;
    for (let i = 0; i < allEmails.length; i += batchSize) {
      const batch = allEmails.slice(i, i + batchSize);
      const promises = batch.map(async (to) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Scorz <notify@notify.scorz.live>`,
            to,
            subject: `${subject} — ${compName}`,
            html: emailHtml,
          }),
        });
        if (res.ok) sentCount++;
        else {
          const errBody = await res.text();
          console.error(`Failed to send to ${to}: ${res.status} ${errBody}`);
        }
      });
      await Promise.all(promises);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      event_type: "broadcast_email",
      title: `Broadcast email sent: ${subject}`,
      description: `Sent to ${sentCount} recipient(s)`,
      actor_id: user.id,
      competition_id,
    });

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("send-broadcast-email error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
