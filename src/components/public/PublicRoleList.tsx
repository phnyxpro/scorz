import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  subEventIds: string[];
  competitionId?: string;
  role: "judges" | "contestants";
}

export function PublicRoleList({ subEventIds, competitionId, role }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-role-list", role, subEventIds, competitionId],
    enabled: subEventIds.length > 0 || (role === "contestants" && !!competitionId),
    queryFn: async () => {
      if (role === "judges") {
        const { data: assignments } = await supabase
          .from("sub_event_assignments")
          .select("user_id")
          .in("sub_event_id", subEventIds)
          .eq("role", "judge");
        const ids = [...new Set((assignments || []).map(a => a.user_id))];
        if (ids.length === 0) return [];
        // Use safe public_profiles view (no PII)
        const { data: profiles } = await supabase
          .from("public_profiles" as any)
          .select("full_name, avatar_url")
          .in("user_id", ids);
        return profiles || [];
      } else {
        // Use safe public_contestants view (no PII)
        let query = supabase
          .from("public_contestants" as any)
          .select("full_name, profile_photo_url, location");

        if (competitionId) {
          query = query.eq("competition_id", competitionId);
        } else {
          query = query.in("sub_event_id", subEventIds);
        }

        const { data: regs } = await query;

        return (regs || []).map((r: any) => ({
          full_name: r.full_name,
          avatar_url: r.profile_photo_url,
          location: r.location,
        }));
      }
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">None listed yet.</p>;

  const Icon = role === "judges" ? Award : Users;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {data.map((person: any, i: number) => (
        <Card key={i} className="border-border/50 bg-card/80">
          <CardContent className="p-3 flex items-center gap-3">
            {person.avatar_url ? (
              <img src={person.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{person.full_name || "Unknown"}</p>
              {person.location && (
                <p className="text-xs text-muted-foreground truncate">{person.location}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
