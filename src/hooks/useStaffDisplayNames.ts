import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDisplayName } from "@/lib/utils";

/**
 * Resolves display names for a list of user IDs using the priority:
 *   staff_invitations.name → profiles.full_name → friendly email
 *
 * Returns a Map<userId, resolvedName>.
 */
export function useStaffDisplayNames(userIds: string[]): Map<string, string> {
  const stableKey = useMemo(() => [...userIds].sort().join(","), [userIds]);

  // 1. Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ["staff-display-profiles", stableKey],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
  });

  // Collect emails for staff invitation lookup
  const emails = useMemo(
    () => (profiles || []).map((p) => p.email).filter(Boolean) as string[],
    [profiles]
  );

  // 2. Fetch staff invitation names
  const { data: staffInvitations } = useQuery({
    queryKey: ["staff-display-invitations", emails.sort().join(",")],
    enabled: emails.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("staff_invitations" as any)
        .select("email, name")
        .in("email", emails) as any);
      if (error) throw error;
      return (data || []) as { email: string; name: string | null }[];
    },
  });

  // 3. Build resolved name map
  return useMemo(() => {
    const nameMap = new Map<string, string>();
    if (!profiles) return nameMap;

    // Build email → staff invitation name
    const staffNameByEmail = new Map<string, string>();
    staffInvitations?.forEach((inv) => {
      if (inv.name) staffNameByEmail.set(inv.email.toLowerCase(), inv.name);
    });

    for (const p of profiles) {
      const staffName = p.email ? staffNameByEmail.get(p.email.toLowerCase()) : undefined;
      nameMap.set(p.user_id, staffName || friendlyDisplayName(p.full_name, p.email));
    }

    return nameMap;
  }, [profiles, staffInvitations]);
}

/**
 * Non-hook helper: resolves names from pre-fetched profiles and staff invitations.
 * Use inside queryFn or other non-hook contexts.
 */
export async function resolveStaffNames(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", userIds);

  const emails = (profiles || []).map((p) => p.email).filter(Boolean) as string[];
  let staffInvitations: { email: string; name: string | null }[] = [];
  if (emails.length) {
    const { data } = await (supabase
      .from("staff_invitations" as any)
      .select("email, name")
      .in("email", emails) as any);
    staffInvitations = (data || []) as { email: string; name: string | null }[];
  }

  const staffNameByEmail = new Map<string, string>();
  staffInvitations.forEach((inv) => {
    if (inv.name) staffNameByEmail.set(inv.email.toLowerCase(), inv.name);
  });

  const result: Record<string, string> = {};
  for (const p of profiles || []) {
    const staffName = p.email ? staffNameByEmail.get(p.email.toLowerCase()) : undefined;
    result[p.user_id] = staffName || friendlyDisplayName(p.full_name, p.email);
  }
  return result;
}
