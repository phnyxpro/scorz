import { useState, useEffect, useMemo } from "react";
import {
  useRegistrationFormConfig,
  useUpsertFormConfig,
  createDefaultFormSchema,
  BUILTIN_KEYS,
} from "@/hooks/useRegistrationForm";
import type { FormSchema, FormSection, FormField, FieldType, FormFieldOption } from "@/hooks/useRegistrationForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, GripVertical, Save, Eye, RotateCcw,
  Type, Mail, Phone, Hash, Link, Calendar, FileText,
  CheckSquare, AlignLeft, ListOrdered, Upload, PenTool,
  Shield, Layers, CalendarClock, Clock, Repeat, Heading, Pilcrow,
  Palette, DollarSign, Star, ToggleLeft, EyeOff, Minus, FileCheck, FileEdit,
  Grid3X3,
} from "lucide-react";

const FIELD_TYPES: { type: FieldType; label: string; icon: any; category: string }[] = [
  { type: "text", label: "Text", icon: Type, category: "Input" },
  { type: "email", label: "Email", icon: Mail, category: "Input" },
  { type: "phone", label: "Phone", icon: Phone, category: "Input" },
  { type: "number", label: "Number", icon: Hash, category: "Input" },
  { type: "url", label: "URL", icon: Link, category: "Input" },
  { type: "date", label: "Date", icon: Calendar, category: "Input" },
  { type: "time", label: "Time", icon: Clock, category: "Input" },
  { type: "textarea", label: "Textarea", icon: AlignLeft, category: "Input" },
  { type: "currency", label: "Currency", icon: DollarSign, category: "Input" },
  { type: "color", label: "Color Picker", icon: Palette, category: "Input" },
  { type: "select", label: "Dropdown", icon: ListOrdered, category: "Choice" },
  { type: "radio", label: "Radio Buttons", icon: ListOrdered, category: "Choice" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, category: "Choice" },
  { type: "toggle", label: "Toggle (Yes/No)", icon: ToggleLeft, category: "Choice" },
  { type: "rating", label: "Rating (1-5)", icon: Star, category: "Choice" },
  { type: "consent", label: "Consent", icon: FileCheck, category: "Choice" },
  { type: "file", label: "File Upload", icon: Upload, category: "Media" },
  { type: "signature", label: "Signature", icon: PenTool, category: "Media" },
  { type: "repeater", label: "Repeater", icon: Repeat, category: "Advanced" },
  { type: "hidden", label: "Hidden Field", icon: EyeOff, category: "Advanced" },
  { type: "heading", label: "Heading", icon: Heading, category: "Layout" },
  { type: "paragraph", label: "Paragraph", icon: Pilcrow, category: "Layout" },
  { type: "divider", label: "Divider", icon: Minus, category: "Layout" },
  { type: "rich_text", label: "Rich Text", icon: FileEdit, category: "Advanced" },
];

const BUILTIN_FIELDS: { key: string; label: string; type: FieldType; icon: any }[] = [
  { key: "full_name", label: "Full Name", type: "text", icon: Type },
  { key: "email", label: "Email", type: "email", icon: Mail },
  { key: "phone", label: "Phone", type: "phone", icon: Phone },
  { key: "location", label: "Location", type: "text", icon: Type },
  { key: "age_category", label: "Age Category", type: "select", icon: ListOrdered },
  { key: "bio", label: "Biography", type: "textarea", icon: AlignLeft },
  { key: "performance_video_url", label: "Video URL", type: "url", icon: Link },
  { key: "guardian_name", label: "Guardian Name", type: "text", icon: Type },
  { key: "guardian_email", label: "Guardian Email", type: "email", icon: Mail },
  { key: "guardian_phone", label: "Guardian Phone", type: "phone", icon: Phone },
  { key: "__level_selector", label: "Level Selector", type: "level_selector", icon: Layers },
  { key: "__subevent_selector", label: "Sub-Event Selector", type: "subevent_selector", icon: CalendarClock },
  { key: "__time_slot_selector", label: "Time Slot Selector", type: "time_slot_selector", icon: Clock },
  { key: "__rules_acknowledgment", label: "Rules Acknowledgment", type: "rules_acknowledgment", icon: Shield },
  { key: "__contestant_signature", label: "Contestant Signature", type: "signature", icon: PenTool },
  { key: "__guardian_signature", label: "Guardian Signature", type: "signature", icon: PenTool },
  { key: "__category_selector", label: "Category Selector", type: "category_selector", icon: Grid3X3 },
  { key: "__subcategory_selector", label: "Sub-Category Selector", type: "subcategory_selector", icon: Grid3X3 },
];

interface Props {
  competitionId: string;
}

export function RegistrationFormEditor({ competitionId }: Props) {
  const { data: existingConfig, isLoading } = useRegistrationFormConfig(competitionId);
  const upsertConfig = useUpsertFormConfig();
  const [schema, setSchema] = useState<FormSchema>([]);
  const [dirty, setDirty] = useState(false);
  const [showAddField, setShowAddField] = useState<string | null>(null);  // section id

  // Initialize schema
  useEffect(() => {
    if (isLoading) return;
    if (existingConfig?.form_schema && (existingConfig.form_schema as any[]).length > 0) {
      setSchema(existingConfig.form_schema);
    } else {
      setSchema(createDefaultFormSchema());
      setDirty(true); // auto-save default
    }
  }, [existingConfig, isLoading]);

  // Track which builtin keys are used
  const usedBuiltinKeys = useMemo(() => {
    const keys = new Set<string>();
    schema.forEach(s => s.fields.forEach(f => { if (f.builtin) keys.add(f.key); }));
    return keys;
  }, [schema]);

  const updateSchema = (newSchema: FormSchema) => {
    setSchema(newSchema);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await upsertConfig.mutateAsync({ competitionId, formSchema: schema });
      setDirty(false);
      toast({ title: "Form saved", description: "Registration form configuration updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReset = () => {
    setSchema(createDefaultFormSchema());
    setDirty(true);
    toast({ title: "Form reset", description: "Restored to default template." });
  };

  // Section operations
  const addSection = () => {
    updateSchema([...schema, {
      id: crypto.randomUUID(),
      title: "New Section",
      description: "",
      fields: [],
    }]);
  };

  const removeSection = (sectionId: string) => {
    updateSchema(schema.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    updateSchema(schema.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...schema];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateSchema(next);
  };

  const moveSectionDown = (idx: number) => {
    if (idx >= schema.length - 1) return;
    const next = [...schema];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateSchema(next);
  };

  // Field operations
  const addFieldToSection = (sectionId: string, field: FormField) => {
    updateSchema(schema.map(s =>
      s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s
    ));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    updateSchema(schema.map(s =>
      s.id === sectionId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s
    ));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    updateSchema(schema.map(s =>
      s.id === sectionId
        ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
        : s
    ));
  };

  const moveFieldUp = (sectionId: string, idx: number) => {
    if (idx === 0) return;
    updateSchema(schema.map(s => {
      if (s.id !== sectionId) return s;
      const fields = [...s.fields];
      [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
      return { ...s, fields };
    }));
  };

  const moveFieldDown = (sectionId: string, idx: number) => {
    const section = schema.find(s => s.id === sectionId);
    if (!section || idx >= section.fields.length - 1) return;
    updateSchema(schema.map(s => {
      if (s.id !== sectionId) return s;
      const fields = [...s.fields];
      [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
      return { ...s, fields };
    }));
  };

  const addBuiltinField = (sectionId: string, key: string) => {
    const builtin = BUILTIN_FIELDS.find(f => f.key === key);
    if (!builtin) return;
    const field: FormField = {
      id: crypto.randomUUID(),
      key: builtin.key,
      label: builtin.label,
      type: builtin.type,
      required: ["full_name", "email", "__rules_acknowledgment", "__contestant_signature"].includes(key),
      builtin: true,
      columns: 1,
    };
    if (key === "age_category") {
      field.options = [{ label: "Adult (18+)", value: "adult" }, { label: "Minor (Under 18)", value: "minor" }];
    }
    if (key === "guardian_name" || key === "guardian_email" || key === "guardian_phone" || key === "__guardian_signature") {
      field.showWhen = { fieldKey: "age_category", equals: "minor" };
    }
    if (key === "__level_selector" || key === "__subevent_selector" || key === "__time_slot_selector" || key === "__rules_acknowledgment" || key === "__contestant_signature" || key === "__guardian_signature" || key === "bio" || key === "performance_video_url") {
      field.columns = 2;
    }
    addFieldToSection(sectionId, field);
    setShowAddField(null);
  };

  const addCustomField = (sectionId: string, type: FieldType) => {
    const field: FormField = {
      id: crypto.randomUUID(),
      key: `custom_${crypto.randomUUID().slice(0, 8)}`,
      label: `New ${FIELD_TYPES.find(t => t.type === type)?.label || "Field"}`,
      type,
      required: false,
      columns: 1,
    };
    if (type === "select" || type === "radio") {
      field.options = [{ label: "Option 1", value: "option_1" }];
    }
    if (type === "repeater") {
      field.repeaterFields = [
        { id: crypto.randomUUID(), key: "item", label: "Item", type: "text", required: false, columns: 1 },
      ];
      field.repeaterLabel = "Add Entry";
      field.columns = 2;
    }
    if (type === "textarea" || type === "heading" || type === "paragraph") {
      field.columns = 2;
    }
    addFieldToSection(sectionId, field);
    setShowAddField(null);
  };

  if (isLoading) return <div className="text-muted-foreground text-sm animate-pulse">Loading form editor…</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold">Registration Form Editor</h3>
              <p className="text-xs text-muted-foreground">
                Define the sections and fields contestants see when registering. {dirty && <Badge variant="outline" className="ml-1 text-[10px] text-primary">Unsaved Changes</Badge>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!dirty || upsertConfig.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" /> {upsertConfig.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {schema.map((section, sIdx) => (
          <Card key={section.id} className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={section.title}
                    onChange={e => updateSection(section.id, { title: e.target.value })}
                    className="text-base font-semibold border-transparent hover:border-border focus:border-border h-8 px-2"
                    placeholder="Section Title"
                  />
                  <Input
                    value={section.description || ""}
                    onChange={e => updateSection(section.id, { description: e.target.value })}
                    className="text-xs text-muted-foreground border-transparent hover:border-border focus:border-border h-7 px-2"
                    placeholder="Section description (optional)"
                  />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSectionUp(sIdx)} disabled={sIdx === 0}>↑</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSectionDown(sIdx)} disabled={sIdx === schema.length - 1}>↓</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSection(section.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Fields */}
              {section.fields.map((field, fIdx) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  sectionId={section.id}
                  index={fIdx}
                  totalFields={section.fields.length}
                  onUpdate={(updates) => updateField(section.id, field.id, updates)}
                  onRemove={() => removeField(section.id, field.id)}
                  onMoveUp={() => moveFieldUp(section.id, fIdx)}
                  onMoveDown={() => moveFieldDown(section.id, fIdx)}
                  allFieldKeys={schema.flatMap(s => s.fields.map(f => f.key))}
                />
              ))}

              {section.fields.length === 0 && (
                <div className="py-6 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No fields in this section. Add fields below.</p>
                </div>
              )}

              <Button
                variant="outline" size="sm"
                onClick={() => setShowAddField(section.id)}
                className="w-full border-dashed mt-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addSection} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Add Section
      </Button>

      {/* Add Field Dialog */}
      <Dialog open={!!showAddField} onOpenChange={(open) => !open && setShowAddField(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Field</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              {/* Built-in fields */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Built-in Fields</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {BUILTIN_FIELDS.filter(f => !usedBuiltinKeys.has(f.key)).map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => showAddField && addBuiltinField(showAddField, f.key)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 hover:bg-muted/50 text-left transition-colors"
                    >
                      <f.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{f.label}</span>
                      
                    </button>
                  ))}
                  {BUILTIN_FIELDS.filter(f => !usedBuiltinKeys.has(f.key)).length === 0 && (
                    <p className="col-span-2 text-xs text-muted-foreground italic py-2">All built-in fields are already in use.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Custom fields by category */}
              {["Input", "Choice", "Media", "Advanced", "Layout"].map(cat => {
                const items = FIELD_TYPES.filter(t => t.category === cat);
                return (
                  <div key={cat}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{cat} Fields</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map(t => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => showAddField && addCustomField(showAddField, t.type)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 hover:bg-muted/50 text-left transition-colors"
                        >
                          <t.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Field Editor ───────────────────────────────────────

function FieldEditor({
  field, sectionId, index, totalFields, onUpdate, onRemove, onMoveUp, onMoveDown, allFieldKeys,
}: {
  field: FormField;
  sectionId: string;
  index: number;
  totalFields: number;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  allFieldKeys: string[];
}) {
  const typeInfo = FIELD_TYPES.find(t => t.type === field.type) || BUILTIN_FIELDS.find(f => f.key === field.key);
  const Icon = typeInfo?.icon || Type;

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors group">
      <div className="flex flex-col gap-0.5 shrink-0 pt-1">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={index === 0}>↑</Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={index === totalFields - 1}>↓</Button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <Input
            value={field.label}
            onChange={e => onUpdate({ label: e.target.value })}
            className="h-6 text-xs font-medium border-transparent hover:border-border focus:border-border px-1 flex-1"
          />
          <span className="text-[9px] text-muted-foreground shrink-0">{field.builtin ? "built-in" : field.type}</span>
          {field.required && <Badge className="text-[9px] bg-primary/20 text-primary shrink-0">req</Badge>}
        </div>

        {/* Inline settings */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
          <label className="flex items-center gap-1 cursor-pointer">
            <Switch
              className="scale-75"
              checked={field.required}
              onCheckedChange={v => onUpdate({ required: v })}
            />
            <span>Required</span>
          </label>
          {field.type !== "heading" && field.type !== "paragraph" && (
            <label className="flex items-center gap-1 cursor-pointer">
              <Switch
                className="scale-75"
                checked={field.columns === 2}
                onCheckedChange={v => onUpdate({ columns: v ? 2 : 1 })}
              />
              <span>Full Width</span>
            </label>
          )}
          <Input
            value={field.placeholder || ""}
            onChange={e => onUpdate({ placeholder: e.target.value })}
            placeholder="Placeholder…"
            className="h-5 text-[10px] w-24 border-transparent hover:border-border px-1"
          />
        </div>

        {/* Options editor for select/radio */}
        {(field.type === "select" || field.type === "radio") && (
          <OptionsEditor
            options={field.options || []}
            onChange={opts => onUpdate({ options: opts })}
          />
        )}

        {/* Repeater sub-fields editor */}
        {field.type === "repeater" && (
          <RepeaterFieldEditor field={field} onUpdate={onUpdate} />
        )}

        {/* Conditional visibility */}
        {(
          <div className="mt-1.5">
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
              <Switch
                className="scale-75"
                checked={!!field.showWhen}
                onCheckedChange={v => {
                  if (v) {
                    onUpdate({ showWhen: { fieldKey: "", equals: "" } });
                  } else {
                    onUpdate({ showWhen: undefined });
                  }
                }}
              />
              <span>Conditional</span>
            </label>
            {field.showWhen && (
              <div className="flex gap-1 mt-1 items-center">
                <span className="text-[10px] text-muted-foreground">Show when</span>
                <Input
                  value={field.showWhen.fieldKey}
                  onChange={e => onUpdate({ showWhen: { ...field.showWhen!, fieldKey: e.target.value } })}
                  placeholder="field key"
                  className="h-5 text-[10px] w-20 px-1"
                />
                <span className="text-[10px]">=</span>
                <Input
                  value={field.showWhen.equals}
                  onChange={e => onUpdate({ showWhen: { ...field.showWhen!, equals: e.target.value } })}
                  placeholder="value"
                  className="h-5 text-[10px] w-20 px-1"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={onRemove}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: FormFieldOption[]; onChange: (opts: FormFieldOption[]) => void }) {
  return (
    <div className="mt-1.5 space-y-1">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input
            value={opt.label}
            onChange={e => {
              const next = [...options];
              next[i] = { ...next[i], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
              onChange(next);
            }}
            placeholder="Option label"
            className="h-5 text-[10px] flex-1 px-1"
          />
          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onChange(options.filter((_, j) => j !== i))}>
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => onChange([...options, { label: "", value: "" }])}>
        <Plus className="h-2.5 w-2.5 mr-0.5" /> Option
      </Button>
    </div>
  );
}

function RepeaterFieldEditor({ field, onUpdate }: { field: FormField; onUpdate: (updates: Partial<FormField>) => void }) {
  const subFields = field.repeaterFields || [];

  const addSubField = () => {
    onUpdate({
      repeaterFields: [...subFields, {
        id: crypto.randomUUID(),
        key: `sub_${crypto.randomUUID().slice(0, 6)}`,
        label: "New Field",
        type: "text",
        required: false,
        columns: 1,
      }],
    });
  };

  const updateSubField = (idx: number, updates: Partial<FormField>) => {
    const next = [...subFields];
    next[idx] = { ...next[idx], ...updates };
    onUpdate({ repeaterFields: next });
  };

  const removeSubField = (idx: number) => {
    onUpdate({ repeaterFields: subFields.filter((_, i) => i !== idx) });
  };

  return (
    <div className="mt-1.5 pl-3 border-l-2 border-primary/20 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-muted-foreground">Repeater Sub-Fields</span>
        <Input
          value={field.repeaterLabel || ""}
          onChange={e => onUpdate({ repeaterLabel: e.target.value })}
          placeholder="Add button label"
          className="h-5 text-[10px] w-28 px-1"
        />
      </div>
      <div className="flex gap-2 text-[10px]">
        <label className="flex items-center gap-1">
          Min: <Input type="number" value={field.repeaterMin ?? ""} onChange={e => onUpdate({ repeaterMin: e.target.value ? Number(e.target.value) : undefined })} className="h-5 w-10 text-[10px] px-1" />
        </label>
        <label className="flex items-center gap-1">
          Max: <Input type="number" value={field.repeaterMax ?? ""} onChange={e => onUpdate({ repeaterMax: e.target.value ? Number(e.target.value) : undefined })} className="h-5 w-10 text-[10px] px-1" />
        </label>
      </div>
      {subFields.map((sf, i) => (
        <div key={sf.id} className="space-y-0.5">
          <div className="flex items-center gap-1 bg-muted/20 rounded px-1.5 py-0.5">
            <Input value={sf.label} onChange={e => updateSubField(i, { label: e.target.value })} className="h-5 text-[10px] flex-1 px-1 border-transparent" />
            <Select value={sf.type} onValueChange={v => updateSubField(i, { type: v as FieldType })}>
              <SelectTrigger className="h-5 text-[10px] w-16 px-1 border-transparent"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["text", "email", "number", "url", "phone", "date", "select", "textarea", "checkbox", "radio", "file", "toggle", "rating"].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-0.5 text-[9px]">
              <Switch className="scale-[0.6]" checked={sf.required} onCheckedChange={v => updateSubField(i, { required: v })} />
              Req
            </label>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeSubField(i)}><Trash2 className="h-2.5 w-2.5" /></Button>
          </div>
          {/* Options for select/radio sub-fields */}
          {(sf.type === "select" || sf.type === "radio") && (
            <div className="pl-3">
              <OptionsEditor options={sf.options || []} onChange={opts => updateSubField(i, { options: opts })} />
            </div>
          )}
          {/* Conditional visibility for sub-fields */}
          <div className="pl-3 flex items-center gap-1">
            <label className="flex items-center gap-0.5 text-[9px] text-muted-foreground cursor-pointer">
              <Switch
                className="scale-[0.6]"
                checked={!!sf.showWhen}
                onCheckedChange={v => {
                  if (v) updateSubField(i, { showWhen: { fieldKey: "", equals: "" } });
                  else updateSubField(i, { showWhen: undefined });
                }}
              />
              Show when
            </label>
            {sf.showWhen && (
              <>
                <Select value={sf.showWhen.fieldKey} onValueChange={v => updateSubField(i, { showWhen: { ...sf.showWhen!, fieldKey: v } })}>
                  <SelectTrigger className="h-4 text-[9px] w-20 px-1"><SelectValue placeholder="field" /></SelectTrigger>
                  <SelectContent>
                    {subFields.filter((_f, fi) => fi !== i).map(f => <SelectItem key={f.key} value={f.key} className="text-[10px]">{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[9px]">=</span>
                <Input value={sf.showWhen.equals} onChange={e => updateSubField(i, { showWhen: { ...sf.showWhen!, equals: e.target.value } })} placeholder="value" className="h-4 text-[9px] w-16 px-1" />
              </>
            )}
          </div>
        </div>
      ))}

      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={addSubField}>
        <Plus className="h-2.5 w-2.5 mr-0.5" /> Sub-Field
      </Button>
    </div>
  );
}
