import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Info, Calendar, PenTool, Save, Loader2, Plus, Trash2, GripVertical } from "lucide-react";
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

export interface CustomFieldDef {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  enabled: boolean;
  required: boolean;
}

type FormConfig = Record<string, FieldConfig> & { _customFields?: CustomFieldDef[] };

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
  category: { enabled: true, required: false },
  subCategory: { enabled: true, required: false },
  subEvent: { enabled: true, required: false },
  rulesAcknowledged: { enabled: true, required: true },
  contestantSignature: { enabled: true, required: true },
  guardianName: { enabled: true, required: false },
  guardianEmail: { enabled: true, required: false },
  guardianSignature: { enabled: true, required: false },
};

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
  custom: Plus,
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
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (competition?.registration_form_config) {
      const saved = competition.registration_form_config as Record<string, any>;
      if (Object.keys(saved).length > 0) {
        const merged: FormConfig = { ...DEFAULT_CONFIG };
        for (const key of Object.keys(merged)) {
          if (key !== "_customFields" && saved[key]) {
            merged[key] = { ...merged[key], ...saved[key] };
          }
        }
        setConfig(merged);
        setCustomFields(Array.isArray(saved._customFields) ? saved._customFields : []);
      } else {
        setConfig(DEFAULT_CONFIG);
        setCustomFields([]);
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

  const addCustomField = () => {
    const newField: CustomFieldDef = {
      id: `cf_${Date.now()}`,
      label: "",
      type: "text",
      enabled: true,
      required: false,
    };
    setCustomFields((prev) => [...prev, newField]);
    setDirty(true);
  };

  const updateCustomField = (id: string, updates: Partial<CustomFieldDef>) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
    setDirty(true);
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate custom fields have labels
    const emptyLabel = customFields.find((f) => !f.label.trim());
    if (emptyLabel) {
      toast({ title: "Custom field missing label", description: "All custom fields need a label before saving.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const fullConfig = { ...config, _customFields: customFields };
      const { error } = await supabase
        .from("competitions")
        .update({ registration_form_config: fullConfig as any })
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
        { key: "category", label: "Category", type: "select", note: "For category-structured levels" },
        { key: "subCategory", label: "Sub-Category", type: "select", note: "Nested category drill-down" },
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
                    <FieldRow
                      key={field.key}
                      label={field.label}
                      typeLabel={field.type === "signature" ? "Signature pad" : field.type}
                      note={field.note}
                      enabled={fc.enabled}
                      required={fc.required}
                      locked={locked}
                      onToggleEnabled={(v) => updateField(field.key, "enabled", v)}
                      onToggleRequired={(v) => updateField(field.key, "required", v)}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Custom Fields Section */}
      <Card className="border-border/40 bg-muted/10">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Custom Fields</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomField} className="gap-1.5 text-xs h-7">
              <Plus className="h-3 w-3" /> Add Field
            </Button>
          </div>

          {customFields.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">
              No custom fields yet. Add fields like "T-Shirt Size", "Dietary Requirements", etc.
            </p>
          )}

          <div className="space-y-2">
            {customFields.map((cf) => (
              <CustomFieldRow
                key={cf.id}
                field={cf}
                onUpdate={(updates) => updateCustomField(cf.id, updates)}
                onRemove={() => removeCustomField(cf.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldRow({
  label,
  typeLabel,
  note,
  enabled,
  required,
  locked,
  onToggleEnabled,
  onToggleRequired,
}: {
  label: string;
  typeLabel: string;
  note?: string;
  enabled: boolean;
  required: boolean;
  locked: boolean;
  onToggleEnabled: (v: boolean) => void;
  onToggleRequired: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
        enabled
          ? "border-border/40 bg-card/60"
          : "border-border/20 bg-muted/20 opacity-50"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Switch
          checked={enabled}
          disabled={locked}
          onCheckedChange={onToggleEnabled}
          className="shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {locked && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Required
              </Badge>
            )}
            {note && (
              <span className="text-[10px] text-muted-foreground">({note})</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground capitalize">{typeLabel}</span>
        </div>
      </div>

      {!locked && enabled && (
        <div className="flex items-center gap-1.5 shrink-0 mt-2 sm:mt-0">
          <Label className="text-[10px] text-muted-foreground">Required</Label>
          <Switch
            checked={required}
            onCheckedChange={onToggleRequired}
            className="scale-75"
          />
        </div>
      )}
    </div>
  );
}

function CustomFieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: CustomFieldDef;
  onUpdate: (updates: Partial<CustomFieldDef>) => void;
  onRemove: () => void;
}) {
  const [optionsText, setOptionsText] = useState(field.options?.join(", ") || "");

  return (
    <div
      className={`p-3 rounded-lg border transition-colors space-y-2 ${
        field.enabled
          ? "border-border/40 bg-card/60"
          : "border-border/20 bg-muted/20 opacity-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Switch
          checked={field.enabled}
          onCheckedChange={(v) => onUpdate({ enabled: v })}
          className="shrink-0"
        />
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Field label (e.g. T-Shirt Size)"
          className="h-8 text-sm flex-1"
        />
        <Select
          value={field.type}
          onValueChange={(v) => onUpdate({ type: v as CustomFieldDef["type"] })}
        >
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Text Area</SelectItem>
            <SelectItem value="select">Dropdown</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 shrink-0">
          <Label className="text-[10px] text-muted-foreground">Req</Label>
          <Switch
            checked={field.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
            className="scale-75"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {field.type === "select" && (
        <div className="pl-10">
          <Input
            value={optionsText}
            onChange={(e) => {
              setOptionsText(e.target.value);
              const opts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              onUpdate({ options: opts });
            }}
            placeholder="Options (comma-separated, e.g. S, M, L, XL)"
            className="h-7 text-xs"
          />
        </div>
      )}
    </div>
  );
}
