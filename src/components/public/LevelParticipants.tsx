import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award } from "lucide-react";
import { friendlyDisplayName } from "@/lib/utils";

export function LevelParticipants({ subEventIds }: { subEventIds: string[] }) {
  const { data } = useQuery({
    queryKey: ["level-participants", subEventIds],
    enabled: subEventIds.length > 0,
    queryFn: async () => {
      // Get judge assignments
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("user_id, role")
        .in("sub_event_id", subEventIds)
        .eq("role", "judge");

      const judgeIds = [...new Set((assignments || []).map(a => a.user_id))];
      let judges: { full_name: string | null }[] = [];
      if (judgeIds.length > 0) {
        // Use safe public_profiles view (no PII)
        const { data: profiles } = await (supabase
          .from("public_profiles" as any)
          .select("full_name")
          .in("user_id", judgeIds) as any);
        judges = (profiles || []) as { full_name: string | null }[];
      }

      // Use safe public_contestants view (no PII)
      const { data: contestants } = await supabase
        .from("public_contestants" as any)
        .select("full_name")
        .in("sub_event_id", subEventIds);

      return { judges, contestants: contestants || [] };
    },
  });

  if (!data || (data.judges.length === 0 && data.contestants.length === 0)) return null;

  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border border-border/30 rounded-md p-3 bg-muted/30">
      {data.judges.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Award className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-foreground">Judges:</span>{" "}
            {data.judges.map((j: any) => j.full_name || "Unknown").join(", ")}
          </div>
        </div>
      )}
      {data.contestants.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Users className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-foreground">Contestants ({data.contestants.length}):</span>{" "}
            {data.contestants.map((c: any) => c.full_name).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
