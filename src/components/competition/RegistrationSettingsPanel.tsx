import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Calendar, ClipboardList, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  competitionId: string;
}

function toLocalDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}
function toLocalTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function RegistrationSettingsPanel({ competitionId }: Props) {
  const qc = useQueryClient();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");

  const { data: competition, isLoading } = useQuery({
    queryKey: ["competition_registration_settings", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, status, registration_enabled, registration_start_at, registration_end_at")
        .eq("id", competitionId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (competition) {
      setRegistrationEnabled(competition.registration_enabled ?? true);
      setStartDate(toLocalDate(competition.registration_start_at));
      setStartTime(toLocalTime(competition.registration_start_at) || "00:00");
      setEndDate(toLocalDate(competition.registration_end_at));
      setEndTime(toLocalTime(competition.registration_end_at) || "23:59");
    }
  }, [competition]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const registration_start_at = startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null;
      const registration_end_at = endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null;

      const { error } = await supabase
        .from("competitions")
        .update({
          registration_enabled: registrationEnabled,
          registration_start_at,
          registration_end_at,
        } as any)
        .eq("id", competitionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Registration settings saved" });
      qc.invalidateQueries({ queryKey: ["competition_registration_settings", competitionId] });
    },
    onError: (error: any) => {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    },
  });

  const isRegistrationActive =
    registrationEnabled &&
    (!startDate || new Date() >= new Date(`${startDate}T${startTime}`)) &&
    (!endDate || new Date() <= new Date(`${endDate}T${endTime}`));

  if (isLoading) {
    return <div className="text-muted-foreground text-sm animate-pulse">Loading settings…</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Registration Settings</CardTitle>
              <CardDescription className="text-xs mt-1">
                Control when registrations are open and manage registration forms
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={isRegistrationActive ? "bg-secondary/10" : "bg-destructive/10"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isRegistrationActive ? "✓ Registration is currently OPEN" : "✗ Registration is currently CLOSED"}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Registration Enabled</p>
              <p className="text-xs text-muted-foreground">Allow contestants to register</p>
            </div>
            <Switch
              checked={registrationEnabled}
              onCheckedChange={setRegistrationEnabled}
            />
          </div>

          <div className="space-y-3 p-3 border border-border/50 rounded-lg">
            <p className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Registration Period
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Leave blank for no time restrictions</p>
          </div>


          <Button
            onClick={() => updateSettings.mutate()}
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? "Saving…" : "Save Registration Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
