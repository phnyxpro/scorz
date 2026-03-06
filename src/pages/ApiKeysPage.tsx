import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Copy, ShieldAlert, Code } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk_scorz_";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function ApiKeysPage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("Default");
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdmin = hasRole("admin");
  const isOrganizer = hasRole("organizer");

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const rawKey = generateApiKey();
      const hashed = await hashKey(rawKey);
      const prefix = rawKey.substring(0, 14) + "...";

      const { error } = await supabase.from("api_keys" as any).insert({
        user_id: user.id,
        key_hash: hashed,
        key_prefix: prefix,
        name: keyName || "Default",
      });
      if (error) throw error;

      setNewKeyRevealed(rawKey);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Key deleted");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!isAdmin && !isOrganizer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin or Organiser role required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            API Access
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys for programmatic access to your competition data</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setNewKeyRevealed(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
            {newKeyRevealed ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy this key now — you won't be able to see it again.
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-xs break-all flex items-start gap-2">
                  <span className="flex-1">{newKeyRevealed}</span>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleCopy(newKeyRevealed)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button className="w-full" onClick={() => { setDialogOpen(false); setNewKeyRevealed(null); }}>Done</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input placeholder="Key name (e.g. Production)" value={keyName} onChange={e => setKeyName(e.target.value)} />
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? "Creating…" : "Generate Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Documentation Card */}
      <Card className="border-border/50 bg-card/80 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-secondary" />
            <CardTitle className="text-sm font-mono">Quick Start</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-3 font-mono text-xs space-y-1 overflow-x-auto">
            <p className="text-muted-foreground">{"// Fetch your competitions"}</p>
            <p>{"const res = await fetch("}</p>
            <p className="pl-4 text-primary">{`"https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || '<project-id>'}.supabase.co/functions/v1/api-v1/competitions",`}</p>
            <p className="pl-4">{`{ headers: { "x-api-key": "sk_scorz_..." } }`}</p>
            <p>{");"}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            API endpoints are being progressively added. Currently supports read-only access to competitions, registrations, and scores.
          </p>
        </CardContent>
      </Card>

      {/* Keys List */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-12 font-mono animate-pulse">Loading keys…</p>
      ) : !keys || keys.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">No API keys yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k: any) => (
            <Card key={k.id} className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{k.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{k.key_prefix}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` • Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.is_active ? "default" : "secondary"}>
                    {k.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
