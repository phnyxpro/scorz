import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setCachedQuery, getCachedQuery, isStale } from "@/lib/offline-db";

interface CacheTable {
  queryKey: string[];
  table: string;
  filter?: Record<string, string>;
  select?: string;
}

export function useOfflineCache(competitionId: string | undefined, subEventId?: string) {
  const qc = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const syncedRef = useRef(false);

  const sync = useCallback(async () => {
    if (!competitionId || syncedRef.current) return;
    syncedRef.current = true;

    const tables: CacheTable[] = [
      { queryKey: ["competition", competitionId], table: "competitions", filter: { id: competitionId } },
      { queryKey: ["levels", competitionId], table: "competition_levels", filter: { competition_id: competitionId } },
      { queryKey: ["rubric_criteria", competitionId], table: "rubric_criteria", filter: { competition_id: competitionId } },
      { queryKey: ["penalty_rules", competitionId], table: "penalty_rules", filter: { competition_id: competitionId } },
      { queryKey: ["registrations", competitionId], table: "contestant_registrations", filter: { competition_id: competitionId } },
      { queryKey: ["competition_infractions", competitionId], table: "competition_infractions", filter: { competition_id: competitionId } },
    ];

    // Add sub-event specific tables if subEventId is provided
    if (subEventId) {
      tables.push(
        { queryKey: ["all_scores", subEventId], table: "judge_scores", filter: { sub_event_id: subEventId } },
        { queryKey: ["certification", subEventId], table: "chief_judge_certifications", filter: { sub_event_id: subEventId } },
        { queryKey: ["tabulator_certification", subEventId], table: "tabulator_certifications", filter: { sub_event_id: subEventId } },
        { queryKey: ["performance_durations", subEventId], table: "performance_durations", filter: { sub_event_id: subEventId } },
      );
    }

    const total = tables.length;
    setSyncProgress({ done: 0, total });

    if (navigator.onLine) {
      setIsSyncing(true);
      let done = 0;

      for (const t of tables) {
        try {
          let query = supabase.from(t.table as any).select(t.select || "*");
          if (t.filter) {
            for (const [key, val] of Object.entries(t.filter)) {
              query = query.eq(key, val);
            }
          }
          const { data, error } = await query;
          if (!error && data) {
            const cacheKey = JSON.stringify(t.queryKey);
            await setCachedQuery(cacheKey, data);
            // Also seed React Query cache
            qc.setQueryData(t.queryKey, t.table === "competitions" ? data[0] : data);
          }
        } catch {
          // continue with other tables
        }
        done++;
        setSyncProgress({ done, total });
      }

      setIsSyncing(false);
      setLastSyncedAt(Date.now());
      setIsReady(true);
    } else {
      // Offline: restore from IndexedDB
      for (const t of tables) {
        try {
          const cacheKey = JSON.stringify(t.queryKey);
          const cached = await getCachedQuery(cacheKey);
          if (cached && !isStale(cached.timestamp)) {
            qc.setQueryData(t.queryKey, cached.data);
          }
        } catch {
          // ignore
        }
      }
      setIsReady(true);
    }
  }, [competitionId, subEventId, qc]);

  useEffect(() => {
    syncedRef.current = false;
    sync();
  }, [sync]);

  // Re-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncedRef.current = false;
      sync();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sync]);

  return { isSyncing, syncProgress, lastSyncedAt, isReady };
}
