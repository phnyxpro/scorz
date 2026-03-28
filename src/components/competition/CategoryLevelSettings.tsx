import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronDown, MapPin, Settings2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export interface LevelSettings {
  location: string;
  event_date: string | null;
  start_time: string;
  end_time: string;
  voting_enabled: boolean;
  use_time_slots: boolean;
  ticketing_type: "none" | "free" | "paid" | "external";
  ticket_price: number | null;
  max_tickets: number | null;
  external_ticket_url: string;
}

const DEFAULT_SETTINGS: LevelSettings = {
  location: "",
  event_date: null,
  start_time: "",
  end_time: "",
  voting_enabled: false,
  use_time_slots: false,
  ticketing_type: "none",
  ticket_price: null,
  max_tickets: null,
  external_ticket_url: "",
};

function useLevelSettings(levelId: string) {
  return useQuery({
    queryKey: ["category_level_settings", levelId],
    queryFn: async () => {
      // Derive settings from the first linked sub_event (they should all share the same settings)
      const { data, error } = await supabase
        .from("sub_events")
        .select("location, event_date, start_time, end_time, voting_enabled, use_time_slots, ticketing_type, ticket_price, max_tickets, external_ticket_url")
        .eq("level_id", levelId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      return {
        location: data.location || "",
        event_date: data.event_date || null,
        start_time: data.start_time || "",
        end_time: data.end_time || "",
        voting_enabled: data.voting_enabled ?? false,
        use_time_slots: data.use_time_slots ?? false,
        ticketing_type: (data.ticketing_type as LevelSettings["ticketing_type"]) || "none",
        ticket_price: data.ticket_price ?? null,
        max_tickets: data.max_tickets ?? null,
        external_ticket_url: data.external_ticket_url || "",
      } as LevelSettings;
    },
  });
}

function useBulkUpdateSubEvents(levelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<LevelSettings>) => {
      // Get all sub_event IDs linked to categories in this level
      const { data: cats } = await supabase
        .from("competition_categories")
        .select("sub_event_id")
        .eq("level_id", levelId)
        .not("sub_event_id", "is", null);
      
      const subEventIds = (cats || []).map(c => c.sub_event_id).filter(Boolean) as string[];
      if (subEventIds.length === 0) return;

      const updatePayload: Record<string, any> = {};
      if (settings.location !== undefined) updatePayload.location = settings.location || null;
      if (settings.event_date !== undefined) updatePayload.event_date = settings.event_date || null;
      if (settings.start_time !== undefined) updatePayload.start_time = settings.start_time || null;
      if (settings.end_time !== undefined) updatePayload.end_time = settings.end_time || null;
      if (settings.voting_enabled !== undefined) updatePayload.voting_enabled = settings.voting_enabled;
      if (settings.use_time_slots !== undefined) updatePayload.use_time_slots = settings.use_time_slots;
      if (settings.ticketing_type !== undefined) updatePayload.ticketing_type = settings.ticketing_type;
      if (settings.ticket_price !== undefined) updatePayload.ticket_price = settings.ticket_price;
      if (settings.max_tickets !== undefined) updatePayload.max_tickets = settings.max_tickets;
      if (settings.external_ticket_url !== undefined) updatePayload.external_ticket_url = settings.external_ticket_url || null;

      const { error } = await supabase
        .from("sub_events")
        .update(updatePayload)
        .in("id", subEventIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category_level_settings", levelId] });
      qc.invalidateQueries({ queryKey: ["sub_events"] });
    },
    onError: (e: any) => toast({ title: "Error updating settings", description: e.message, variant: "destructive" }),
  });
}

export function CategoryLevelSettings({ levelId }: { levelId: string }) {
  const { data: savedSettings, isLoading } = useLevelSettings(levelId);
  const bulkUpdate = useBulkUpdateSubEvents(levelId);
  const [settings, setSettings] = useState<LevelSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  const applySettings = useCallback((partial: Partial<LevelSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    bulkUpdate.mutate(partial);
  }, [settings, bulkUpdate]);

  if (isLoading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-md">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30 rounded-t-md">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Level Settings
          <ChevronDown className={cn("h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-4">
        {/* Location */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</Label>
          <Input
            placeholder="Venue / Room"
            value={settings.location}
            onChange={(e) => setSettings(s => ({ ...s, location: e.target.value }))}
            onBlur={() => applySettings({ location: settings.location })}
            className="h-8 text-xs"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-8 text-xs w-full justify-start font-normal", !settings.event_date && "text-muted-foreground")}>
                  {settings.event_date ? format(parseISO(settings.event_date), "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settings.event_date ? parseISO(settings.event_date) : undefined}
                  onSelect={(d) => {
                    const val = d ? format(d, "yyyy-MM-dd") : null;
                    applySettings({ event_date: val });
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start Time</Label>
            <Input
              type="time"
              value={settings.start_time}
              onChange={(e) => setSettings(s => ({ ...s, start_time: e.target.value }))}
              onBlur={() => applySettings({ start_time: settings.start_time })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Time</Label>
            <Input
              type="time"
              value={settings.end_time}
              onChange={(e) => setSettings(s => ({ ...s, end_time: e.target.value }))}
              onBlur={() => applySettings({ end_time: settings.end_time })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.voting_enabled}
              onCheckedChange={(v) => applySettings({ voting_enabled: v })}
            />
            <Label className="text-xs">People's Choice</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.use_time_slots}
              onCheckedChange={(v) => applySettings({ use_time_slots: v })}
            />
            <Label className="text-xs">Use Time Slots</Label>
          </div>
        </div>

        {/* Ticketing */}
        <div className="space-y-2">
          <Label className="text-xs">Ticketing</Label>
          <Select
            value={settings.ticketing_type}
            onValueChange={(v) => applySettings({ ticketing_type: v as LevelSettings["ticketing_type"] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Ticket</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>

          {settings.ticketing_type === "paid" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ticket Price</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={settings.ticket_price ?? ""}
                  onChange={(e) => setSettings(s => ({ ...s, ticket_price: e.target.value ? Number(e.target.value) : null }))}
                  onBlur={() => applySettings({ ticket_price: settings.ticket_price })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Tickets</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={settings.max_tickets ?? ""}
                  onChange={(e) => setSettings(s => ({ ...s, max_tickets: e.target.value ? Number(e.target.value) : null }))}
                  onBlur={() => applySettings({ max_tickets: settings.max_tickets })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {settings.ticketing_type === "external" && (
            <div className="space-y-1">
              <Label className="text-xs">External Ticket URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={settings.external_ticket_url}
                onChange={(e) => setSettings(s => ({ ...s, external_ticket_url: e.target.value }))}
                onBlur={() => applySettings({ external_ticket_url: settings.external_ticket_url })}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { DEFAULT_SETTINGS };
export type { LevelSettings as CategoryLevelSettingsType };
