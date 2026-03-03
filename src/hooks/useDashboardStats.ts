import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStat {
  label: string;
  value: number | null;
}

export function useDashboardStats() {
  const { user, roles } = useAuth();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const results: DashboardStat[] = [];

      try {
        // Active competitions – relevant to everyone
        const { count: activeComps } = await supabase
          .from("competitions")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "draft"]);
        results.push({ label: "Active Events", value: activeComps ?? 0 });

        const isAdminOrOrg = roles.includes("admin") || roles.includes("organizer");
        const isJudge = roles.includes("judge") || roles.includes("chief_judge");
        const isTabulator = roles.includes("tabulator") || roles.includes("witness");
        const isContestant = roles.includes("contestant");

        if (isAdminOrOrg) {
          const { count: pendingRegs } = await supabase
            .from("contestant_registrations")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");
          results.push({ label: "Pending Registrations", value: pendingRegs ?? 0 });

          const { count: totalContestants } = await supabase
            .from("contestant_registrations")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved");
          results.push({ label: "Approved Contestants", value: totalContestants ?? 0 });
        }

        if (isJudge) {
          const { count: unscoredCount } = await supabase
            .from("sub_event_assignments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("role", ["judge", "chief_judge"]);
          results.push({ label: "My Assignments", value: unscoredCount ?? 0 });

          const { count: uncertified } = await supabase
            .from("judge_scores")
            .select("id", { count: "exact", head: true })
            .eq("judge_id", user.id)
            .eq("is_certified", false);
          results.push({ label: "Uncertified Scores", value: uncertified ?? 0 });
        }

        if (isTabulator) {
          const { count: pendingCerts } = await supabase
            .from("tabulator_certifications")
            .select("id", { count: "exact", head: true })
            .eq("is_certified", false);
          results.push({ label: "Pending Verifications", value: pendingCerts ?? 0 });
        }

        if (isContestant) {
          const { count: myRegs } = await supabase
            .from("contestant_registrations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          results.push({ label: "My Registrations", value: myRegs ?? 0 });
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }

      if (!cancelled) {
        setStats(results);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [user?.id, roles]);

  return { stats, loading };
}
