import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Info, Calendar, PenTool, Save, Loader2, Plus, Trash2, GripVertical, Eye, ChevronDown,
  Type, Hash, Mail, Phone, Link, ListOrdered, CheckSquare, Upload, PenLine, FileCheck, Heading,
  RadioTower, CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  FormFieldConfig, FormBuilderConfig, migrateFormConfig, LOCKED_KEYS,
  FIELD_TYPE_LABELS, SECTION_LABELS,
} from "@/lib/form-builder-types";

// Re-export for backward compat with ContestantRegistration import
export type CustomFieldDef = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  enabled: boolean;
  required: boolean;
};

interface Props {
  competitionId: string;
}

const FIELD_TYPE_ICONS: Record<string, React.ElementType> = {
  short_text: Type,
  long_text: Type,
  email: Mail,
  phone: Phone,
  url: Link,
  number: Hash,
  date: CalendarDays,
  dropdown: ListOrdered,
  radio: RadioTower,
  checkbox: CheckSquare,
  file: Upload,
  signature: PenLine,
  consent: FileCheck,
  section_header: Heading,
};

const sectionIcon: Record<string, React.ElementType> = {
  personal: User,
  bio: Info,
  event: Calendar,
  legal: PenTool,
  custom: Plus,
};

export function RegistrationFormsInline({ competitionId }: Props) {
  const qc = useQueryClient();

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

  const [config, setConfig] = useState<FormBuilderConfig>({ fields: [], version: 1 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  useEffect(() => {
    if (competition?.registration_form_config) {
      const migrated = migrateFormConfig(competition.registration_form_config);
      setConfig(migrated);
    } else {
      setConfig(migrateFormConfig({}));
    }
  }, [competition]);

  const selectedField = useMemo(
    () => config.fields.find(f => f.id === selectedFieldId) || null,
    [config.fields, selectedFieldId]
  );

  const updateField = (id: string, updates: Partial<FormFieldConfig>) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
    setDirty(true);
  };

  const addField = (type: FormFieldConfig["field_type"]) => {
    const newField: FormFieldConfig = {
      id: `cf_${Date.now()}`,
      field_type: type,
      label: type === "section_header" ? "Section Title" : "",
      enabled: true,
      required: false,
      sort_order: config.fields.length,
      width: "full",
      show_on_profile: false,
      show_on_scorecard: false,
      is_builtin: false,
      section: "custom",
    };
    if (type === "dropdown" || type === "radio" || type === "checkbox") {
      newField.options = [{ label: "Option 1", value: "option_1" }];
    }
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newField.id);
    setAddFieldOpen(false);
    setDirty(true);
  };

  const removeField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id),
    }));
    if (selectedFieldId === id) setSelectedFieldId(null);
    setDirty(true);
  };

  const moveField = (id: string, direction: "up" | "down") => {
    setConfig(prev => {
      const idx = prev.fields.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.fields.length) return prev;
      const fields = [...prev.fields];
      [fields[idx], fields[targetIdx]] = [fields[targetIdx], fields[idx]];
      return { ...prev, fields: fields.map((f, i) => ({ ...f, sort_order: i })) };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    const emptyLabel = config.fields.find(f => !f.is_builtin && !f.label.trim() && f.field_type !== "section_header");
    if (emptyLabel) {
      toast({ title: "Field missing label", description: "All custom fields need a label before saving.", variant: "destructive" });
      return;
    }
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

  // Group built-in fields by section
  const builtinSections = useMemo(() => {
    const sections: Record<string, FormFieldConfig[]> = {};
    config.fields.filter(f => f.is_builtin).forEach(f => {
      const sec = f.section || "personal";
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(f);
    });
    return sections;
  }, [config.fields]);

  const customFields = useMemo(
    () => config.fields.filter(f => !f.is_builtin),
    [config.fields]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Configure the registration form fields. Toggle visibility on profiles and score cards.
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Field Canvas */}
        <div className="space-y-3">
          {/* Built-in sections */}
          {Object.entries(builtinSections).map(([sectionKey, fields]) => {
            const Icon = sectionIcon[sectionKey] || User;
            return (
              <Collapsible key={sectionKey} defaultOpen>
                <Card className="border-border/40 bg-muted/10">
                  <CardContent className="p-3 sm:p-4 space-y-2">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground flex-1">{SECTION_LABELS[sectionKey] || sectionKey}</h3>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5">
                      {fields.map(field => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          isSelected={selectedFieldId === field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          onToggleEnabled={(v) => updateField(field.id, { enabled: v })}
                        />
                      ))}
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}

          {/* Custom fields section */}
          <Card className="border-border/40 bg-muted/10">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Custom Fields</h3>
                  <Badge variant="secondary" className="text-[10px]">{customFields.length}</Badge>
                </div>
                <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                      <Plus className="h-3 w-3" /> Add Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Field</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 py-2">
                      {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldConfig["field_type"], string][])
                        .filter(([t]) => !["signature", "consent"].includes(t))
                        .map(([type, label]) => {
                          const Icon = FIELD_TYPE_ICONS[type] || Type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => addField(type)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 text-sm transition-colors text-left"
                            >
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {customFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  No custom fields. Add fields like "Group Name", "T-Shirt Size", etc.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {customFields.map((field, idx) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      onToggleEnabled={(v) => updateField(field.id, { enabled: v })}
                      onRemove={() => removeField(field.id)}
                      onMoveUp={idx > 0 ? () => moveField(field.id, "up") : undefined}
                      onMoveDown={idx < customFields.length - 1 ? () => moveField(field.id, "down") : undefined}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Properties Panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {selectedField ? (
            <FieldPropertiesPanel
              field={selectedField}
              allFields={config.fields}
              onUpdate={(updates) => updateField(selectedField.id, updates)}
              onClose={() => setSelectedFieldId(null)}
            />
          ) : (
            <Card className="border-border/40 bg-muted/10">
              <CardContent className="py-12 text-center">
                <Eye className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Select a field to edit its properties</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  field,
  isSelected,
  onClick,
  onToggleEnabled,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FormFieldConfig;
  isSelected: boolean;
  onClick: () => void;
  onToggleEnabled: (v: boolean) => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const locked = field.is_builtin && field.key && LOCKED_KEYS.has(field.key);
  const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : field.enabled
            ? "border-border/40 bg-card/60 hover:border-border"
            : "border-border/20 bg-muted/20 opacity-50"
      }`}
    >
      {!field.is_builtin && (
        <div className="flex flex-col gap-0.5 shrink-0">
          {onMoveUp && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="text-muted-foreground hover:text-foreground">
              <GripVertical className="h-3 w-3 rotate-90" />
            </button>
          )}
        </div>
      )}

      <Switch
        checked={field.enabled}
        disabled={!!locked}
        onCheckedChange={(v) => { onToggleEnabled(v); }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />

      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{field.label || "Untitled"}</span>
          {locked && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Locked</Badge>}
          {field.required && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Required</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{FIELD_TYPE_LABELS[field.field_type]}</span>
          {field.show_on_profile && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">Profile</Badge>}
          {field.show_on_scorecard && <Badge variant="outline" className="text-[9px] px-1 py-0 border-secondary/30 text-secondary">Score Card</Badge>}
        </div>
      </div>

      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function FieldPropertiesPanel({
  field,
  allFields,
  onUpdate,
  onClose,
}: {
  field: FormFieldConfig;
  allFields: FormFieldConfig[];
  onUpdate: (updates: Partial<FormFieldConfig>) => void;
  onClose: () => void;
}) {
  const locked = field.is_builtin && field.key && LOCKED_KEYS.has(field.key);
  const hasOptions = ["dropdown", "radio", "checkbox"].includes(field.field_type);
  const hasValidation = ["short_text", "long_text", "number"].includes(field.field_type);

  // Options as editable text
  const [optionsText, setOptionsText] = useState(
    field.options?.map(o => o.label).join(", ") || ""
  );

  useEffect(() => {
    setOptionsText(field.options?.map(o => o.label).join(", ") || "");
  }, [field.id, field.options]);

  // Conditional logic fields (only non-section custom fields)
  const logicFieldCandidates = allFields.filter(
    f => f.id !== field.id && f.enabled && f.field_type !== "section_header"
  );

  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Field Properties</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-6 px-2">
            Close
          </Button>
        </div>

        <Separator />

        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            disabled={field.is_builtin}
            className="h-8 text-sm"
          />
        </div>

        {/* Placeholder */}
        {!["consent", "signature", "section_header"].includes(field.field_type) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={field.placeholder || ""}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="h-8 text-sm"
              placeholder="Placeholder text..."
            />
          </div>
        )}

        {/* Help text */}
        <div className="space-y-1.5">
          <Label className="text-xs">Help Text</Label>
          <Input
            value={field.help_text || ""}
            onChange={(e) => onUpdate({ help_text: e.target.value })}
            className="h-8 text-sm"
            placeholder="Additional guidance..."
          />
        </div>

        <Separator />

        {/* Required */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Required</Label>
          <Switch
            checked={field.required}
            disabled={!!locked}
            onCheckedChange={(v) => onUpdate({ required: v })}
            className="scale-90"
          />
        </div>

        {/* Width */}
        <div className="space-y-1.5">
          <Label className="text-xs">Width</Label>
          <Select value={field.width} onValueChange={(v) => onUpdate({ width: v as "full" | "half" })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Width</SelectItem>
              <SelectItem value="half">Half Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Visibility flags */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Visibility</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs">Show on Contestant Profile</Label>
              <p className="text-[10px] text-muted-foreground">Display this value on the contestant's profile page</p>
            </div>
            <Switch
              checked={field.show_on_profile}
              onCheckedChange={(v) => onUpdate({ show_on_profile: v })}
              className="scale-90"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs">Show on Judge Score Card</Label>
              <p className="text-[10px] text-muted-foreground">Display on the scoring screen & printed cards</p>
            </div>
            <Switch
              checked={field.show_on_scorecard}
              onCheckedChange={(v) => onUpdate({ show_on_scorecard: v })}
              className="scale-90"
            />
          </div>
        </div>

        {/* Options editor */}
        {hasOptions && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs">Options (comma-separated)</Label>
              <Textarea
                value={optionsText}
                onChange={(e) => {
                  setOptionsText(e.target.value);
                  const opts = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  onUpdate({ options: opts.map(o => ({ label: o, value: o.toLowerCase().replace(/\s+/g, "_") })) });
                }}
                placeholder="Option 1, Option 2, Option 3"
                className="min-h-[60px] text-xs resize-none"
              />
            </div>
          </>
        )}

        {/* Validation */}
        {hasValidation && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Validation</Label>
              {field.field_type === "number" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Min</Label>
                    <Input
                      type="number"
                      value={field.validation?.min ?? ""}
                      onChange={(e) => onUpdate({ validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Max</Label>
                    <Input
                      type="number"
                      value={field.validation?.max ?? ""}
                      onChange={(e) => onUpdate({ validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Min Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.min_length ?? ""}
                      onChange={(e) => onUpdate({ validation: { ...field.validation, min_length: e.target.value ? Number(e.target.value) : undefined } })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Max Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.max_length ?? ""}
                      onChange={(e) => onUpdate({ validation: { ...field.validation, max_length: e.target.value ? Number(e.target.value) : undefined } })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Conditional logic */}
        {!field.is_builtin && field.field_type !== "section_header" && (
          <>
            <Separator />
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground w-full">
                <ChevronDown className="h-3 w-3" /> Conditional Logic
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Show when field</Label>
                  <Select
                    value={field.logic?.show_when?.field_id || ""}
                    onValueChange={(v) => onUpdate({
                      logic: v ? {
                        show_when: {
                          field_id: v,
                          operator: field.logic?.show_when?.operator || "not_empty",
                          value: field.logic?.show_when?.value || "",
                        }
                      } : undefined,
                    })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Always show" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Always show</SelectItem>
                      {logicFieldCandidates.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.label || f.key || f.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field.logic?.show_when?.field_id && (
                  <>
                    <Select
                      value={field.logic.show_when.operator}
                      onValueChange={(v) => onUpdate({
                        logic: { show_when: { ...field.logic!.show_when!, operator: v as any } }
                      })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Does not equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="not_empty">Is filled</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.logic.show_when.operator !== "not_empty" && (
                      <Input
                        value={field.logic.show_when.value}
                        onChange={(e) => onUpdate({
                          logic: { show_when: { ...field.logic!.show_when!, value: e.target.value } }
                        })}
                        placeholder="Value"
                        className="h-7 text-xs"
                      />
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}
