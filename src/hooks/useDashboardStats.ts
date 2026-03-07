import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStat {
  label: string;
  value: number | null;
  to: string;
}

export function useDashboardStats(effectiveUserId?: string) {
  const { user, roles } = useAuth();
  const uid = effectiveUserId || user?.id;
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!uid) {
      setStats([]);
      setLoading(false);
      return;
    }

    const results: DashboardStat[] = [];

    try {
      const { count: activeComps } = await supabase
        .from("competitions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "draft"]);
      results.push({ label: "Active Events", value: activeComps ?? 0, to: "/competitions" });

      const isAdminOrOrg = roles.includes("admin") || roles.includes("organizer");
      const isJudge = roles.includes("judge");
      const isTabulator = roles.includes("tabulator");
      const isContestant = roles.includes("contestant");

      if (isAdminOrOrg) {
        const { count: pendingRegs } = await supabase
          .from("contestant_registrations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        results.push({ label: "Pending Registrations", value: pendingRegs ?? 0, to: "/registrations" });

        const { count: totalContestants } = await supabase
          .from("contestant_registrations")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved");
        results.push({ label: "Approved Contestants", value: totalContestants ?? 0, to: "/contestants" });

        // Total judges
        const { count: totalJudges } = await supabase
          .from("sub_event_assignments")
          .select("user_id", { count: "exact", head: true });
        results.push({ label: "Total Judges", value: totalJudges ?? 0, to: "/staff" });

        // Recent registrations (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: recentRegs } = await supabase
          .from("contestant_registrations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString());
        results.push({ label: "Recent Registrations", value: recentRegs ?? 0, to: "/registrations" });

        // Upcoming events (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const { count: upcomingEvents } = await supabase
          .from("sub_events")
          .select("id", { count: "exact", head: true })
          .gte("event_date", new Date().toISOString().split('T')[0])
          .lte("event_date", thirtyDaysFromNow.toISOString().split('T')[0]);
        results.push({ label: "Upcoming Events", value: upcomingEvents ?? 0, to: "/competitions" });
      }

      if (isJudge) {
        const { count: unscoredCount } = await supabase
          .from("sub_event_assignments")
          .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
          .eq("role", "judge" as any);
        results.push({ label: "My Assignments", value: unscoredCount ?? 0, to: "/judge-dashboard" });

        const { count: uncertified } = await supabase
          .from("judge_scores")
          .select("id", { count: "exact", head: true })
          .eq("judge_id", uid)
          .eq("is_certified", false);
        results.push({ label: "Uncertified Scores", value: uncertified ?? 0, to: "/judge-dashboard" });
      }

      if (isTabulator) {
        const { count: pendingCerts } = await supabase
          .from("tabulator_certifications")
          .select("id", { count: "exact", head: true })
          .eq("is_certified", false);
        results.push({ label: "Pending Verifications", value: pendingCerts ?? 0, to: "/tabulator" });
      }

      if (isContestant) {
        const { count: myRegs } = await supabase
          .from("contestant_registrations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        results.push({ label: "My Registrations", value: myRegs ?? 0, to: "/profile" });
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }

    setStats(results);
    setLoading(false);
  }, [user?.id, roles]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime subscriptions – refetch counts on any relevant change
  useEffect(() => {
    if (!user) return;

    const tables = ["competitions", "contestant_registrations", "judge_scores", "tabulator_certifications", "sub_event_assignments"];

    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "contestant_registrations" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "judge_scores" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "tabulator_certifications" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "sub_event_assignments" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStats]);

  return { stats, loading };
}
