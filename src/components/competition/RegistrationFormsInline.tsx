import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Info, Calendar, PenTool, Save, Loader2 } from "lucide-react";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { AGE_CATEGORIES } from "@/lib/age-categories";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Props {
  competitionId: string;
}

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

type FormConfig = Record<string, FieldConfig>;

const DEFAULT_CONFIG: FormConfig = {
  firstName: { enabled: true, required: true },
  lastName: { enabled: true, required: true },
  email: { enabled: true, required: true },
  phone: { enabled: true, required: false },
  location: { enabled: true, required: false },
  ageCategory: { enabled: true, required: true },
  bio: { enabled: true, required: false },
  videoUrl: { enabled: true, required: false },
  level: { enabled: true, required: false },
  subEvent: { enabled: true, required: false },
  rulesAcknowledged: { enabled: true, required: true },
  contestantSignature: { enabled: true, required: true },
  guardianName: { enabled: true, required: false },
  guardianEmail: { enabled: true, required: false },
  guardianSignature: { enabled: true, required: false },
};

// Fields that cannot be disabled (core identity)
const LOCKED_FIELDS = new Set(["firstName", "lastName", "email"]);

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "url" | "textarea" | "select" | "checkbox" | "signature";
  note?: string;
  options?: string[];
}

const sectionIcon: Record<string, React.ElementType> = {
  personal: User,
  bio: Info,
  event: Calendar,
  legal: PenTool,
};

export function RegistrationFormsInline({ competitionId }: Props) {
  const qc = useQueryClient();
  const { data: levels } = useLevels(competitionId);
  const firstLevelId = levels?.[0]?.id;
  const { data: subEvents } = useSubEvents(firstLevelId);

  const { data: competition } = useQuery({
    queryKey: ["competition_form_config", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("registration_form_config")
        .eq("id", competitionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (competition?.registration_form_config) {
      const saved = competition.registration_form_config as Record<string, any>;
      if (Object.keys(saved).length > 0) {
        // Merge saved config with defaults to pick up any new fields
        const merged = { ...DEFAULT_CONFIG };
        for (const key of Object.keys(merged)) {
          if (saved[key]) {
            merged[key] = { ...merged[key], ...saved[key] };
          }
        }
        setConfig(merged);
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, [competition]);

  const updateField = (key: string, prop: "enabled" | "required", value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], [prop]: value },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({ registration_form_config: config as any })
        .eq("id", competitionId);
      if (error) throw error;
      toast({ title: "Form configuration saved" });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["competition_form_config", competitionId] });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sections: { key: string; title: string; fields: FieldDef[] }[] = [
    {
      key: "personal",
      title: "Personal Info",
      fields: [
        { key: "firstName", label: "First Name", type: "text" },
        { key: "lastName", label: "Last Name", type: "text" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone", type: "tel" },
        { key: "location", label: "Location", type: "text" },
        { key: "ageCategory", label: "Age Category", type: "select", options: AGE_CATEGORIES.map((c) => c.label) },
      ],
    },
    {
      key: "bio",
      title: "Bio & Media",
      fields: [
        { key: "bio", label: "Bio", type: "textarea" },
        { key: "videoUrl", label: "Performance Video URL", type: "url" },
      ],
    },
    {
      key: "event",
      title: "Event Details",
      fields: [
        { key: "level", label: "Level", type: "select", options: levels?.map((l) => l.name) || [] },
        { key: "subEvent", label: "Sub-Event", type: "select", options: subEvents?.map((se) => se.name) || [] },
      ],
    },
    {
      key: "legal",
      title: "Legal & Consent",
      fields: [
        { key: "rulesAcknowledged", label: "Rules Acknowledged", type: "checkbox" },
        { key: "contestantSignature", label: "Contestant Signature", type: "signature" },
        { key: "guardianName", label: "Guardian Name", type: "text", note: "For minors" },
        { key: "guardianEmail", label: "Guardian Email", type: "email", note: "For minors" },
        { key: "guardianSignature", label: "Guardian Signature", type: "signature", note: "For minors" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Toggle fields on/off and set which are required. Changes apply to the contestant registration form.
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {sections.map((section) => {
        const Icon = sectionIcon[section.key] || User;
        return (
          <Card key={section.key} className="border-border/40 bg-muted/10">
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
              </div>

              <div className="space-y-2">
                {section.fields.map((field) => {
                  const fc = config[field.key] || { enabled: true, required: false };
                  const locked = LOCKED_FIELDS.has(field.key);

                  return (
                    <div
                      key={field.key}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        fc.enabled
                          ? "border-border/40 bg-card/60"
                          : "border-border/20 bg-muted/20 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Enable toggle */}
                        <Switch
                          checked={fc.enabled}
                          disabled={locked}
                          onCheckedChange={(v) => updateField(field.key, "enabled", v)}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                            {locked && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Required
                              </Badge>
                            )}
                            {field.note && (
                              <span className="text-[10px] text-muted-foreground">({field.note})</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground capitalize">{field.type === "signature" ? "Signature pad" : field.type}</span>
                        </div>
                      </div>

                      {/* Required toggle */}
                      {!locked && fc.enabled && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Label className="text-[10px] text-muted-foreground">Required</Label>
                          <Switch
                            checked={fc.required}
                            onCheckedChange={(v) => updateField(field.key, "required", v)}
                            className="scale-75"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
