import { useState } from "react";
import { useCompetitionUpdates, useCreateUpdate, useDeleteUpdate } from "@/hooks/useCompetitionUpdates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Bell } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function UpdatesManager({ competitionId }: { competitionId: string }) {
  const { data: updates, isLoading } = useCompetitionUpdates(competitionId);
  const create = useCreateUpdate();
  const remove = useDeleteUpdate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notifyContestants, setNotifyContestants] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    create.mutate(
      { competition_id: competitionId, title: title.trim(), content: content.trim() },
      {
        onSuccess: async () => {
          if (notifyContestants) {
            setNotifying(true);
            try {
              const { data, error } = await supabase.functions.invoke("send-competition-update", {
                body: { competition_id: competitionId, title: title.trim(), content: content.trim() },
              });
              if (error) throw error;
              toast({ title: "Notifications sent", description: `${(data as any)?.sent ?? 0} contestants notified` });
            } catch (err: any) {
              toast({ title: "Notification failed", description: err.message, variant: "destructive" });
            } finally {
              setNotifying(false);
            }
          }
          setTitle("");
          setContent("");
          setNotifyContestants(false);
        },
      }
    );
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader><CardTitle className="text-base">News & Updates</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}
        {updates?.map(u => (
          <div key={u.id} className="border border-border/50 rounded-md p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{u.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(u.published_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate({ id: u.id, competition_id: competitionId })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{u.content}</p>
          </div>
        ))}

        <div className="border border-dashed border-border rounded-md p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Post Update</p>
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} rows={3} />
          <div className="flex items-center gap-2">
            <Switch id="notify-toggle" checked={notifyContestants} onCheckedChange={setNotifyContestants} />
            <Label htmlFor="notify-toggle" className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Bell className="h-3.5 w-3.5" /> Notify approved contestants via email
            </Label>
          </div>
          <Button onClick={handleAdd} disabled={!title.trim() || !content.trim() || create.isPending || notifying} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {notifying ? "Sending…" : "Post Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
