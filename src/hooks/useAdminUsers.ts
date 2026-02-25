import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({ title: "Error loading users", description: profilesError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: allRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast({ title: "Error loading roles", description: rolesError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Group roles by user
    const roleMap = new Map<string, AppRole[]>();
    allRoles?.forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role as AppRole);
      roleMap.set(r.user_id, existing);
    });

    const merged: AdminUser[] = (profiles || []).map((p) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: roleMap.get(p.user_id) || [],
    }));

    setUsers(merged);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const assignRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Role already assigned", variant: "destructive" });
      } else {
        toast({ title: "Error assigning role", description: error.message, variant: "destructive" });
      }
      return false;
    }

    toast({ title: "Role assigned", description: `${role} role added successfully.` });
    await fetchUsers();
    return true;
  };

  const revokeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast({ title: "Error revoking role", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Role revoked", description: `${role} role removed successfully.` });
    await fetchUsers();
    return true;
  };

  return { users, loading, refetch: fetchUsers, assignRole, revokeRole };
}
