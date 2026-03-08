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

  const isAdminOrOrg = roles.includes("admin") || roles.includes("organizer");
  const isJudge = roles.includes("judge");
  const isTabulator = roles.includes("tabulator");
  const isContestant = roles.includes("contestant");

  const fetchStats = useCallback(async () => {
    if (!uid) {
      setStats([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_dashboard_stats", {
        _user_id: uid,
        _is_admin_or_org: isAdminOrOrg,
        _is_judge: isJudge,
        _is_tabulator: isTabulator,
        _is_contestant: isContestant,
      });

      if (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats([]);
      } else {
        setStats((data as DashboardStat[]) || []);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }

    setLoading(false);
  }, [uid, isAdminOrOrg, isJudge, isTabulator, isContestant]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime subscriptions – refetch counts on any relevant change
  useEffect(() => {
    if (!uid) return;

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
  }, [uid, fetchStats]);

  return { stats, loading };
}
