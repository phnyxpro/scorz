import { useState } from "react";
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

export function RegistrationSettingsPanel({ competitionId }: Props) {
  const qc = useQueryClient();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");

  // Fetch current registration settings
  const { data: competition, isLoading } = useQuery({
    queryKey: ["competition_registration_settings", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, status, description")
        .eq("id", competitionId)
        .single();
      if (error) throw error;
      // registration_enabled/start/end columns don't exist yet — use defaults
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async () => {
      let startDateTime = null;
      let endDateTime = null;

      if (startDate && startTime) {
        startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
      }

      if (endDate && endTime) {
        endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
      }

      const { error } = await supabase
        .from("competitions")
        .update({
          registration_enabled: registrationEnabled,
          registration_start_date: startDateTime,
          registration_end_date: endDateTime,
        })
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
          {/* Registration Status Alert */}
          <Alert className={isRegistrationActive ? "bg-secondary/10" : "bg-destructive/10"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isRegistrationActive ? "✓ Registration is currently OPEN" : "✗ Registration is currently CLOSED"}
            </AlertDescription>
          </Alert>

          {/* Enable/Disable Toggle */}
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

          {/* Registration Period */}
          <div className="space-y-3 p-3 border border-border/50 rounded-lg">
            <p className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Registration Period
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Leave blank for no time restrictions
            </p>
          </div>

          {/* Form Management Link */}
          <div className="p-3 border border-border/50 rounded-lg">
            <p className="font-medium text-sm flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4" />
              Registration Forms
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Create and manage custom registration forms for this competition
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <a href={`/competitions/${competitionId}/forms`}>
                Manage Registration Forms
              </a>
            </Button>
          </div>

          {/* Save Button */}
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
