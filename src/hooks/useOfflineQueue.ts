import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { queueMutation, getPendingMutations, updateMutationStatus, clearSyncedMutations, getPendingCount } from "@/lib/offline-db";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type MutationType =
  | "upsert_score"
  | "certify_score"
  | "upsert_chief_cert"
  | "certify_sub_event"
  | "upsert_tab_cert"
  | "certify_tabulator";

async function executeMutation(type: MutationType, payload: Record<string, unknown>) {
  switch (type) {
    case "upsert_score": {
      let id = payload.id as string | undefined;
      if (!id) {
        // Avoid duplicate rows: reuse an existing score for this judge/contestant/sub-event
        const { data: existing, error: findErr } = await supabase
          .from("judge_scores")
          .select("id")
          .eq("sub_event_id", payload.sub_event_id as string)
          .eq("judge_id", payload.judge_id as string)
          .eq("contestant_registration_id", payload.contestant_registration_id as string)
          .maybeSingle();
        if (findErr) throw findErr;
        id = existing?.id;
      }
      if (id) {
        const { id: _omit, ...rest } = payload as any;
        const { error } = await supabase.from("judge_scores").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("judge_scores").insert(payload as any).select().single();
        if (error) throw error;
      }
      break;
    }
    case "certify_score": {
      const { error } = await supabase.from("judge_scores").update({
        judge_signature: payload.judge_signature as string,
        signed_at: payload.signed_at as string,
        is_certified: true,
      }).eq("id", payload.id as string);
      if (error) throw error;
      break;
    }
    case "upsert_chief_cert": {
      const id = payload.id as string | undefined;
      if (id) {
        const { error } = await supabase.from("chief_judge_certifications").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chief_judge_certifications").insert(payload as any).select().single();
        if (error) throw error;
      }
      break;
    }
    case "certify_sub_event": {
      const { error } = await supabase.from("chief_judge_certifications").update({
        chief_judge_signature: payload.chief_judge_signature as string,
        signed_at: payload.signed_at as string,
        is_certified: true,
      }).eq("id", payload.id as string);
      if (error) throw error;
      break;
    }
    case "upsert_tab_cert": {
      const id = payload.id as string | undefined;
      if (id) {
        const { error } = await supabase.from("tabulator_certifications").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tabulator_certifications").insert(payload as any).select().single();
        if (error) throw error;
      }
      break;
    }
    case "certify_tabulator": {
      const { error } = await supabase.from("tabulator_certifications").update({
        tabulator_signature: payload.tabulator_signature as string,
        signed_at: payload.signed_at as string,
        is_certified: true,
      }).eq("id", payload.id as string);
      if (error) throw error;
      break;
    }
  }
}

export function useOfflineQueue() {
  const qc = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushErrors, setFlushErrors] = useState<string[]>([]);
  const flushingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  const enqueue = useCallback(async (type: MutationType, payload: Record<string, unknown>) => {
    if (navigator.onLine) {
      // Try online first
      try {
        await executeMutation(type, payload);
        return { offline: false };
      } catch {
        // Fall through to offline queue
      }
    }
    // Queue offline
    await queueMutation(type, { ...payload, _mutationType: type });
    await refreshCount();
    toast({ title: "Saved offline", description: "Will sync when back online" });
    return { offline: true };
  }, [refreshCount]);

  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    flushingRef.current = true;
    setIsFlushing(true);
    const errors: string[] = [];

    try {
      const pending = await getPendingMutations();
      if (!pending.length) {
        setIsFlushing(false);
        flushingRef.current = false;
        return;
      }

      for (const entry of pending) {
        const key = entry.key;
        try {
          const { _mutationType, ...payload } = entry.payload as any;
          await executeMutation(_mutationType || entry.mutationType, payload);
          await updateMutationStatus(key, "synced");
        } catch (err: any) {
          errors.push(err.message || "Unknown error");
          await updateMutationStatus(key, "failed", err.message);
        }
      }

      await clearSyncedMutations();
      await refreshCount();
      setFlushErrors(errors);

      if (errors.length === 0 && pending.length > 0) {
        toast({ title: "Synced", description: `${pending.length} offline change(s) synced successfully` });
      } else if (errors.length > 0) {
        toast({ title: "Sync issues", description: `${errors.length} change(s) failed to sync`, variant: "destructive" });
      }

      // Invalidate relevant queries
      qc.invalidateQueries();
    } finally {
      setIsFlushing(false);
      flushingRef.current = false;
    }
  }, [refreshCount, qc]);

  // Auto-flush on reconnect
  useEffect(() => {
    refreshCount();
    const handleOnline = () => flush();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flush, refreshCount]);

  const retry = useCallback(async () => {
    // Reset failed back to pending
    try {
      const { getOfflineDB } = await import("@/lib/offline-db");
      const db = await getOfflineDB();
      const tx = db.transaction("offline_mutations", "readwrite");
      const store = tx.objectStore("offline_mutations");
      const index = store.index("by-status");
      let cursor = await index.openCursor("failed");
      while (cursor) {
        const record = cursor.value;
        record.status = "pending";
        delete record.error;
        await cursor.update(record);
        cursor = await cursor.continue();
      }
      await tx.done;
      await refreshCount();
      setFlushErrors([]);
      flush();
    } catch {
      // ignore
    }
  }, [flush, refreshCount]);

  return { pendingCount, isFlushing, flushErrors, enqueue, flush, retry };
}
