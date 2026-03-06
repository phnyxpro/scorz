import { useState, useCallback } from "react";
import { formatRoleName } from "@/lib/utils";
import { TableSkeleton } from "@/components/shared/PageSkeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Constants } from "@/integrations/supabase/types";
import { Shield, Search, UserPlus, X, RefreshCw, ShieldAlert, Users, Trophy, BarChart3, Eye, Settings, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import GlobalSettingsPanel from "@/components/admin/GlobalSettingsPanel";
import BillingPanel from "@/components/admin/BillingPanel";

const ALL_ROLES = Constants.public.Enums.app_role;

const roleBadgeColor: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  organizer: "bg-primary/15 text-primary border-primary/30",
  chief_judge: "bg-secondary/15 text-secondary border-secondary/30",
  judge: "bg-secondary/15 text-secondary border-secondary/30",
  tabulator: "bg-muted text-muted-foreground border-border",
  contestant: "bg-primary/10 text-primary border-primary/20",
  audience: "bg-muted text-muted-foreground border-border",
};

function RoleManager({ user, assignRole, revokeRole }: {
  user: AdminUser;
  assignRole: (userId: string, role: string) => Promise<boolean>;
  revokeRole: (userId: string, role: string) => Promise<boolean>;
}) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const availableRoles = ALL_ROLES.filter((r) => !user.roles.includes(r as any));

  const handleAssign = async () => {
    if (!selectedRole) return;
    setBusy(true);
    await assignRole(user.user_id, selectedRole as any);
    setSelectedRole("");
    setBusy(false);
  };

  const handleRevoke = async (role: string) => {
    setBusy(true);
    await revokeRole(user.user_id, role as any);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">{user.full_name || "Unnamed"}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2">Current Roles</p>
        <div className="flex flex-wrap gap-1.5">
          {user.roles.length === 0 && <span className="text-xs text-muted-foreground italic">No roles assigned</span>}
          {user.roles.map((role) => (
            <Badge key={role} variant="outline" className={`${roleBadgeColor[role] || ""} text-xs gap-1`}>
              {role.replace("_", " ").replace("organizer", "organiser")}
              <button onClick={() => handleRevoke(role)} disabled={busy} className="ml-0.5 hover:text-destructive transition-colors" title={`Revoke ${role}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      {availableRoles.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue placeholder="Select role to add..." /></SelectTrigger>
            <SelectContent>
              {availableRoles.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">{formatRoleName(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAssign} disabled={!selectedRole || busy} className="h-9">
            <UserPlus className="h-3.5 w-3.5 mr-1" />Add
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const { hasRole, startMasquerade, subscription, refreshSubscription } = useAuth();
  const { users, loading, refetch, assignRole, revokeRole } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [manageUser, setManageUser] = useState<AdminUser | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-platform-stats"],
    enabled: hasRole("admin"),
    queryFn: async () => {
      const [{ count: userCount }, { count: compCount }, { count: activeCount }, { count: regCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("competitions").select("*", { count: "exact", head: true }),
        supabase.from("competitions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("contestant_registrations").select("*", { count: "exact", head: true }),
      ]);
      return { users: userCount || 0, competitions: compCount || 0, active: activeCount || 0, registrations: regCount || 0 };
    },
  });


  if (!hasRole("admin")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin role required.</p>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.roles.some((r) => r.includes(q));
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, settings, and billing</p>
      </div>

      {/* Platform Analytics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
            { label: "Competitions", value: stats.competitions, icon: Trophy, color: "text-secondary" },
            { label: "Active Events", value: stats.active, icon: BarChart3, color: "text-accent" },
            { label: "Registrations", value: stats.registrations, icon: UserPlus, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
                <div>
                  <p className="text-xl font-bold font-mono text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="users" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1"><Settings className="h-3.5 w-3.5" />Settings</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-mono">All Users ({filtered.length})</CardTitle>
                <div className="flex gap-2 w-full sm:max-w-xs">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                  </div>
                  <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="h-9">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">Name</TableHead>
                      <TableHead className="font-mono text-xs">Email</TableHead>
                      <TableHead className="font-mono text-xs">Roles</TableHead>
                      <TableHead className="font-mono text-xs w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No users found.</TableCell>
                      </TableRow>
                    )}
                    {filtered.map((u) => (
                      <motion.tr key={u.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b transition-colors hover:bg-muted/50">
                        <TableCell className="text-sm font-medium">
                          {u.full_name || <span className="text-muted-foreground italic">Unnamed</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 && <span className="text-xs text-muted-foreground italic">none</span>}
                            {u.roles.map((r) => (
                              <Badge key={r} variant="outline" className={`${roleBadgeColor[r] || ""} text-[10px]`}>{r.replace("_", " ")}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog open={manageUser?.user_id === u.user_id} onOpenChange={(open) => setManageUser(open ? u : null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-xs h-8">Manage</Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="font-mono text-base">Manage Roles</DialogTitle>
                                </DialogHeader>
                                {manageUser && (
                                  <RoleManager
                                    user={manageUser}
                                    assignRole={async (uid, role) => {
                                      const ok = await assignRole(uid, role as any);
                                      if (ok) setManageUser((prev) => prev ? { ...prev, roles: [...prev.roles, role as any] } : null);
                                      return ok;
                                    }}
                                    revokeRole={async (uid, role) => {
                                      const ok = await revokeRole(uid, role as any);
                                      if (ok) setManageUser((prev) => prev ? { ...prev, roles: prev.roles.filter((r) => r !== role) } : null);
                                      return ok;
                                    }}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost" size="sm" className="text-xs h-8" title="View as this user"
                              onClick={() => startMasquerade({ userId: u.user_id, email: u.email || "", fullName: u.full_name || "" })}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <GlobalSettingsPanel />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <BillingPanel subscription={subscription ? { subscribed: subscription.subscribed, product_id: subscription.productId, credits_total: subscription.creditsTotal, credits_used: subscription.creditsUsed, credits_available: subscription.creditsAvailable } : undefined} onRefresh={() => refreshSubscription()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
