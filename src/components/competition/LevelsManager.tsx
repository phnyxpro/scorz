import { useState } from "react";
import { useLevels, useCreateLevel, useDeleteLevel, useSubEvents, useCreateSubEvent, useDeleteSubEvent } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, MapPin, Clock, Vote, CalendarDays } from "lucide-react";
import { BannerUpload } from "@/components/shared/BannerUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

function SubEventsPanel({ levelId }: { levelId: string }) {
  const { data: events } = useSubEvents(levelId);
  const create = useCreateSubEvent();
  const remove = useDeleteSubEvent();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [votingEnabled, setVotingEnabled] = useState(false);

  const resetForm = () => {
    setName(""); setLocation(""); setEventDate(""); setStartTime(""); setEndTime(""); setVotingEnabled(false);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    create.mutate(
      { level_id: levelId, name, location: location || undefined, event_date: eventDate || undefined, start_time: startTime || undefined, end_time: endTime || undefined, voting_enabled: votingEnabled },
      { onSuccess: () => { resetForm(); setModalOpen(false); } }
    );
  };

  const updateBanner = async (id: string, url: string | null) => {
    await supabase.from("sub_events").update({ banner_url: url } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sub_events", levelId] });
  };

  return (
    <div className="pl-4 border-l border-border/50 space-y-3 mt-3">
      <Button size="sm" variant="outline" onClick={() => setModalOpen(true)} className="w-full h-8 text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Sub-Event
      </Button>

      {events?.map((e) => (
        <div key={e.id} className="bg-muted/50 rounded-md px-3 py-2 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{e.name}</span>
              {e.location && <span className="text-muted-foreground text-xs"><MapPin className="h-3 w-3 inline" /> {e.location}</span>}
              {e.event_date && <span className="text-muted-foreground text-xs"><Clock className="h-3 w-3 inline" /> {e.event_date}</span>}
              {(e as any).voting_enabled && <span className="text-xs text-primary"><Vote className="h-3 w-3 inline" /> People's Choice</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate({ id: e.id, level_id: levelId })}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <BannerUpload
            currentUrl={(e as any).banner_url}
            folder={`sub-events/${e.id}`}
            aspectLabel="Sub-Event Banner"
            onUploaded={(url) => updateBanner(e.id, url)}
            onRemoved={() => updateBanner(e.id, null)}
          />
        </div>
      ))}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sub-Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Event Name *</Label>
              <Input placeholder="e.g. Semi-Finals Night" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input placeholder="Venue or room" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="voting-toggle" className="text-sm font-medium">People's Choice Voting</Label>
                <p className="text-xs text-muted-foreground">Enable audience voting for this sub-event</p>
              </div>
              <Switch id="voting-toggle" checked={votingEnabled} onCheckedChange={setVotingEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setModalOpen(false); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={create.isPending || !name.trim()}>
              {create.isPending ? "Adding…" : "Add Sub-Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LevelsManager({ competitionId }: { competitionId: string }) {
  const { data: levels } = useLevels(competitionId);
  const create = useCreateLevel();
  const remove = useDeleteLevel();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    create.mutate(
      { competition_id: competitionId, name: newName, sort_order: (levels?.length || 0) },
      { onSuccess: () => setNewName("") }
    );
  };

  const updateLevelBanner = async (id: string, url: string | null) => {
    await supabase.from("competition_levels").update({ banner_url: url } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["levels", competitionId] });
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Levels & Sub-Events</CardTitle>
        </div>
        <CardDescription>Organize your competition into levels (e.g. Auditions, Finals) and add sub-events with schedules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="New level name (e.g. Auditions)" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
          <Button size="sm" onClick={handleAdd} disabled={create.isPending || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {levels?.map((l) => (
          <Collapsible key={l.id}>
            <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                {l.name}
              </CollapsibleTrigger>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate({ id: l.id, competition_id: competitionId })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <CollapsibleContent>
              <div className="pl-4 mt-2">
                <BannerUpload
                  currentUrl={(l as any).banner_url}
                  folder={`levels/${l.id}`}
                  aspectLabel="Level Banner"
                  onUploaded={(url) => updateLevelBanner(l.id, url)}
                  onRemoved={() => updateLevelBanner(l.id, null)}
                />
              </div>
              <SubEventsPanel levelId={l.id} />
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
