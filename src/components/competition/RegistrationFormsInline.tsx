import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Info, Calendar, PenTool, Save, Loader2, Plus, Trash2, GripVertical, Eye, ChevronDown, ChevronUp,
  Type, Hash, Mail, Phone, Link, ListOrdered, CheckSquare, Upload, PenLine, FileCheck, Heading,
  RadioTower, CalendarDays, Edit2, Layers, Clock, Palette, DollarSign, Star, ToggleLeft, EyeOff,
  Minus, FileText, Repeat, FileInput, BookmarkPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  FormFieldConfig, FormBuilderConfig, SectionConfig, migrateFormConfig, LOCKED_KEYS,
  FIELD_TYPE_LABELS, DEFAULT_SECTIONS, getConfigSections, FORM_TEMPLATES,
} from "@/lib/form-builder-types";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import { BUILTIN_KEYS } from "@/hooks/useRegistrationForm";
import type { FormSchema, FormField, FormSection, FieldType, ShowWhenCondition } from "@/hooks/useRegistrationForm";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

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
  time: Clock,
  dropdown: ListOrdered,
  radio: RadioTower,
  checkbox: CheckSquare,
  file: Upload,
  signature: PenLine,
  consent: FileCheck,
  section_header: Heading,
  color: Palette,
  currency: DollarSign,
  rating: Star,
  toggle: ToggleLeft,
  hidden: EyeOff,
  divider: Minus,
  rich_text: FileText,
  repeater: Repeat,
  category_selector: ListOrdered,
  subcategory_selector: ListOrdered,
  level_selector: Layers,
};

const FIELD_TYPE_CATEGORIES: Record<string, string[]> = {
  Input: ["short_text", "long_text", "email", "phone", "url", "number", "date", "time", "currency"],
  Choice: ["dropdown", "radio", "checkbox", "toggle", "rating"],
  Media: ["file"],
  Advanced: ["signature", "consent", "hidden", "repeater", "category_selector", "subcategory_selector", "level_selector"],
  Layout: ["section_header", "divider", "rich_text", "color"],
};

const SECTION_ICON_MAP: Record<string, React.ElementType> = {
  user: User,
  info: Info,
  calendar: Calendar,
  "pen-tool": PenTool,
  plus: Plus,
  layers: Layers,
};

function getSectionIcon(section: SectionConfig): React.ElementType {
  return SECTION_ICON_MAP[section.icon || "layers"] || Layers;
}

// Convert current builder config to FormSchema for preview
function builderConfigToFormSchema(config: FormBuilderConfig): FormSchema {
  const sections = getConfigSections(config);
  const enabledFields = config.fields.filter(f => f.enabled !== false);
  const fieldTypeMap: Record<string, FieldType> = {
    short_text: "text", long_text: "textarea", email: "email", phone: "phone",
    number: "number", url: "url", date: "date", dropdown: "select",
    checkbox: "checkbox", radio: "radio", file: "file",
    signature: "signature", consent: "consent", section_header: "heading",
    repeater: "repeater", category_selector: "category_selector",
    subcategory_selector: "subcategory_selector", rating: "rating",
    toggle: "toggle", divider: "divider", hidden: "hidden", rich_text: "rich_text",
    time: "time", color: "color", currency: "currency", level_selector: "level_selector",
    name_list: "name_list",
  };
  const builtinKeyMap: Record<string, string> = {
    firstName: "full_name", lastName: "__lastName", email: "email", phone: "phone",
    location: "location", ageCategory: "age_category", bio: "bio",
    videoUrl: "performance_video_url", guardianName: "guardian_name",
    guardianEmail: "guardian_email", guardianPhone: "guardian_phone",
    level: "__level_selector", category: "__category_selector",
    subCategory: "__subcategory_selector", subEvent: "__subevent_selector",
    rulesAcknowledged: "__rules_acknowledgment",
    contestantSignature: "__contestant_signature", guardianSignature: "__guardian_signature",
  };
  const specialTypeMap: Record<string, FieldType> = {
    "__level_selector": "level_selector", "__subevent_selector": "subevent_selector",
    "__category_selector": "category_selector", "__subcategory_selector": "subcategory_selector",
    "__time_slot_selector": "time_slot_selector", "__rules_acknowledgment": "rules_acknowledgment",
    "__contestant_signature": "signature", "__guardian_signature": "signature",
  };

  let schema: FormSchema = sections
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(sec => {
      const sectionFields = enabledFields
        .filter(f => f.section === sec.id && !f.parent_repeater_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(f => {
          const rawKey = f.key || f.id?.replace("builtin_", "") || f.id;
          const mappedKey = f.is_builtin ? (builtinKeyMap[rawKey] || rawKey) : rawKey;
          const isBuiltin = f.is_builtin && BUILTIN_KEYS.has(mappedKey);
          const fieldType = specialTypeMap[mappedKey] || fieldTypeMap[f.field_type] || "text";
          const field: FormField = {
            id: f.id,
            key: mappedKey,
            label: f.label,
            type: fieldType,
            required: !!f.required,
            placeholder: f.help_text || "",
            description: f.help_text || "",
            builtin: isBuiltin,
            columns: f.width === "half" ? 1 : 2,
            options: f.options?.map(o => typeof o === "string" ? { label: o, value: o } : o),
          };
          // Map top-level conditional logic
          if (f.logic?.show_when) {
            const sw = f.logic.show_when;
            const target = enabledFields.find(tf => tf.id === sw.field_id);
            if (target) {
              const targetKey = target.key || target.id;
              field.showWhen = { fieldKey: targetKey, operator: sw.operator || "equals", value: sw.value };
            }
          }
          // Attach repeater children
          if (f.field_type === "repeater") {
            const children = enabledFields
              .filter(cf => cf.parent_repeater_id === f.id)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(cf => {
                const ck = cf.key || cf.id;
                const cmk = cf.is_builtin ? (builtinKeyMap[ck] || ck) : ck;
                const cType = specialTypeMap[cmk] || fieldTypeMap[cf.field_type] || "text";
                const child: FormField = {
                  id: cf.id, key: cmk, label: cf.label, type: cType,
                  required: !!cf.required, placeholder: cf.help_text || "",
                  description: cf.help_text || "", builtin: false,
                  columns: cf.width === "half" ? 1 : 2,
                  options: cf.options?.map(o => typeof o === "string" ? { label: o, value: o } : o),
                };
                if (cf.logic?.show_when) {
                  const sw = cf.logic.show_when;
                  const target = enabledFields.find(tf => tf.id === sw.field_id);
                  if (target) {
                    const targetKey = target.key || target.id;
                    child.showWhen = { fieldKey: targetKey, operator: sw.operator || "equals", value: sw.value };
                  }
                }
                return child;
              });
            if (children.length > 0) {
              field.repeaterFields = children;
              field.repeaterLabel = f.help_text || "Add Entry";
            }
          }
          return field;
        });
      return { id: sec.id, title: sec.label || sec.id, description: "", fields: sectionFields } as FormSection;
    })
    .filter(s => s.fields.length > 0);

  return schema;
}

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

  const [config, setConfig] = useState<FormBuilderConfig>({ fields: [], sections: DEFAULT_SECTIONS, version: 1 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [addFieldSection, setAddFieldSection] = useState<string>("custom");
  const [addFieldRepeaterId, setAddFieldRepeaterId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Section management state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  const { user } = useAuth();

  // Fetch user-saved templates
  const { data: userTemplates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["form_templates", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_templates" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { error } = await supabase
        .from("form_templates" as any)
        .insert({ user_id: user!.id, name, description: description || null, config: config as any } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTemplates();
      setSaveTemplateOpen(false);
      setTemplateName("");
      setTemplateDesc("");
      toast({ title: "Template saved", description: "You can reuse this template in other competitions." });
    },
    onError: (err: any) => toast({ title: "Failed to save template", description: err.message, variant: "destructive" }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchTemplates(),
  });

  useEffect(() => {
    if (competition?.registration_form_config) {
      const migrated = migrateFormConfig(competition.registration_form_config);
      // Ensure sections exist
      if (!migrated.sections || migrated.sections.length === 0) {
        migrated.sections = DEFAULT_SECTIONS;
      }
      setConfig(migrated);
    } else {
      setConfig({ ...migrateFormConfig({}), sections: DEFAULT_SECTIONS });
    }
  }, [competition]);

  const sections = useMemo(() => getConfigSections(config), [config]);

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

  const addField = (type: FormFieldConfig["field_type"], sectionId: string, repeaterId?: string | null) => {
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
      section: sectionId,
      parent_repeater_id: repeaterId || undefined,
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
    setAddFieldRepeaterId(null);
    setDirty(true);
  };

  const removeField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      // Remove the field and any children if it's a repeater
      fields: prev.fields.filter(f => f.id !== id && f.parent_repeater_id !== id),
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

  // DnD: reorder fields within a section (or repeater children)
  const handleFieldDragEnd = (event: DragEndEvent, sectionId: string, repeaterId?: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setConfig(prev => {
      const fieldList = repeaterId
        ? prev.fields.filter(f => f.parent_repeater_id === repeaterId)
        : prev.fields.filter(f => (f.section || "custom") === sectionId && !f.parent_repeater_id);

      const oldIdx = fieldList.findIndex(f => f.id === active.id);
      const newIdx = fieldList.findIndex(f => f.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;

      const reordered = arrayMove(fieldList, oldIdx, newIdx);
      const reorderedIds = new Set(reordered.map(f => f.id));
      const otherFields = prev.fields.filter(f => !reorderedIds.has(f.id));

      // Reassign sort_order
      let sortCounter = 0;
      const allFields = [...otherFields, ...reordered.map(f => ({ ...f, sort_order: sortCounter++ }))];

      return { ...prev, fields: allFields };
    });
    setDirty(true);
  };

  // DnD: reorder sections
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setConfig(prev => {
      const secs = [...(prev.sections || DEFAULT_SECTIONS)].sort((a, b) => a.sort_order - b.sort_order);
      const oldIdx = secs.findIndex(s => s.id === active.id);
      const newIdx = secs.findIndex(s => s.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const reordered = arrayMove(secs, oldIdx, newIdx).map((s, i) => ({ ...s, sort_order: i }));
      return { ...prev, sections: reordered };
    });
    setDirty(true);
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // --- Section CRUD ---
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionName("");
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section: SectionConfig) => {
    setEditingSection(section);
    setSectionName(section.label);
    setSectionDialogOpen(true);
  };

  const handleSaveSectionDialog = () => {
    if (!sectionName.trim()) {
      toast({ title: "Section name is required", variant: "destructive" });
      return;
    }
    if (editingSection) {
      // Edit existing
      setConfig(prev => ({
        ...prev,
        sections: (prev.sections || DEFAULT_SECTIONS).map(s =>
          s.id === editingSection.id ? { ...s, label: sectionName.trim() } : s
        ),
      }));
    } else {
      // Add new
      const id = `section_${Date.now()}`;
      const maxOrder = Math.max(...(config.sections || DEFAULT_SECTIONS).map(s => s.sort_order), 0);
      setConfig(prev => ({
        ...prev,
        sections: [...(prev.sections || DEFAULT_SECTIONS), {
          id,
          label: sectionName.trim(),
          icon: "layers",
          is_builtin: false,
          sort_order: maxOrder + 1,
        }],
      }));
    }
    setSectionDialogOpen(false);
    setDirty(true);
  };

  const handleDeleteSection = (sectionId: string) => {
    // Move fields in this section to "custom"
    setConfig(prev => ({
      ...prev,
      sections: (prev.sections || DEFAULT_SECTIONS).filter(s => s.id !== sectionId),
      fields: prev.fields.map(f => f.section === sectionId ? { ...f, section: "custom" } : f),
    }));
    setDeleteSectionId(null);
    setDirty(true);
  };

  const moveSectionOrder = (sectionId: string, direction: "up" | "down") => {
    setConfig(prev => {
      const secs = [...(prev.sections || DEFAULT_SECTIONS)].sort((a, b) => a.sort_order - b.sort_order);
      const idx = secs.findIndex(s => s.id === sectionId);
      if (idx < 0) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= secs.length) return prev;
      [secs[idx], secs[targetIdx]] = [secs[targetIdx], secs[idx]];
      return { ...prev, sections: secs.map((s, i) => ({ ...s, sort_order: i })) };
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
      toast({ title: "Form configuration saved", description: "Changes are now live for Add Registration and contestant sign-up." });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["competition_form_config", competitionId] });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Group fields by section (exclude repeater children — they render inside their parent)
  const fieldsBySection = useMemo(() => {
    const map: Record<string, FormFieldConfig[]> = {};
    for (const s of sections) {
      map[s.id] = [];
    }
    for (const f of config.fields) {
      if (f.parent_repeater_id) continue; // skip children; they render nested
      const sec = f.section || "custom";
      if (!map[sec]) map[sec] = [];
      map[sec].push(f);
    }
    return map;
  }, [config.fields, sections]);

  // Index repeater children by parent id
  const childrenByRepeater = useMemo(() => {
    const map: Record<string, FormFieldConfig[]> = {};
    for (const f of config.fields) {
      if (f.parent_repeater_id) {
        if (!map[f.parent_repeater_id]) map[f.parent_repeater_id] = [];
        map[f.parent_repeater_id].push(f);
      }
    }
    return map;
  }, [config.fields]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Configure sections and fields for the registration form.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5 text-xs h-7">
            <Eye className="h-3 w-3" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(true)} className="gap-1.5 text-xs h-7">
            <BookmarkPlus className="h-3 w-3" /> Save Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)} className="gap-1.5 text-xs h-7">
            <FileInput className="h-3 w-3" /> Load Template
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddSection} className="gap-1.5 text-xs h-7">
            <Plus className="h-3 w-3" /> Add Section
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Sections & Fields Canvas */}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => {
                const sectionFields = fieldsBySection[section.id] || [];
                return (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    sectionFields={sectionFields}
                    childrenByRepeater={childrenByRepeater}
                    selectedFieldId={selectedFieldId}
                    dndSensors={dndSensors}
                    onSelectField={setSelectedFieldId}
                    onToggleField={(id, v) => updateField(id, { enabled: v })}
                    onRemoveField={removeField}
                    onEditSection={handleEditSection}
                    onDeleteSection={setDeleteSectionId}
                    onAddField={(sectionId, repeaterId) => {
                      setAddFieldSection(sectionId);
                      setAddFieldRepeaterId(repeaterId || null);
                      setAddFieldOpen(true);
                    }}
                    onFieldDragEnd={(e) => handleFieldDragEnd(e, section.id)}
                    onRepeaterChildDragEnd={(e, repeaterId) => handleFieldDragEnd(e, section.id, repeaterId)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Right: Properties Panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {selectedField ? (
            <FieldPropertiesPanel
              field={selectedField}
              allFields={config.fields}
              sections={sections}
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

      {/* Add Field Dialog */}
      <Dialog open={addFieldOpen} onOpenChange={(open) => { setAddFieldOpen(open); if (!open) setAddFieldRepeaterId(null); }}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{addFieldRepeaterId ? "Add Field to Repeater" : "Add Field"}</DialogTitle>
            {addFieldRepeaterId && (
              <p className="text-xs text-muted-foreground">This field will repeat with each entry.</p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              {Object.entries(FIELD_TYPE_CATEGORIES).map(([category, types]) => {
                // Don't allow nested repeaters
                const filteredTypes = addFieldRepeaterId
                  ? types.filter(t => t !== "repeater" && t !== "section_header" && t !== "divider")
                  : types;
                if (filteredTypes.length === 0) return null;
                return (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{category}</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredTypes.map((type) => {
                        const label = FIELD_TYPE_LABELS[type as FormFieldConfig["field_type"]] || type;
                        const Icon = FIELD_TYPE_ICONS[type] || Type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => addField(type as FormFieldConfig["field_type"], addFieldSection, addFieldRepeaterId)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 hover:bg-muted/50 text-left transition-colors"
                          >
                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Section Name</Label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. Group Details"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveSectionDialog()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveSectionDialog}>
              {editingSection ? "Save" : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation */}
      <Dialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Section?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Fields in this section will be moved to "Custom Fields". This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteSectionId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteSectionId && handleDeleteSection(deleteSectionId)}>
              Delete Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Form Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose a template to replace the current form configuration. You can customise it after loading.
          </p>
          <div className="space-y-2 mt-2">
            {FORM_TEMPLATES.map(t => (
              <Card key={t.id} className="border-border/40 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => {
                  const built = t.build();
                  setConfig(built);
                  setDirty(true);
                  setSelectedFieldId(null);
                  setTemplateDialogOpen(false);
                  toast({ title: `"${t.name}" template loaded`, description: "Review and click Save to persist." });
                }}
              >
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Form Preview
            </DialogTitle>
            <DialogDescription>
              This is how the registration form will appear to contestants.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {previewOpen && (
              <FormPreviewContent config={config} competitionId={competitionId} />
            )}
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormPreviewContent({ config, competitionId }: { config: FormBuilderConfig; competitionId: string }) {
  const previewSchema = useMemo(() => builderConfigToFormSchema(config), [config]);

  if (previewSchema.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No enabled fields to preview.</p>
        <p className="text-xs mt-1">Add fields and enable them to see the form.</p>
      </div>
    );
  }

  return (
    <DynamicRegistrationForm
      formSchema={previewSchema}
      competitionId={competitionId}
      mode="walkin"
      onSubmit={() => {
        toast({ title: "Preview only", description: "This is a preview — no data was submitted." });
      }}
      isSubmitting={false}
    />
  );
}

// ─── Sortable Section Card ──────────────────────────────

function SortableSectionCard({
  section, sectionFields, childrenByRepeater, selectedFieldId, dndSensors,
  onSelectField, onToggleField, onRemoveField, onEditSection, onDeleteSection, onAddField,
  onFieldDragEnd, onRepeaterChildDragEnd,
}: {
  section: SectionConfig;
  sectionFields: FormFieldConfig[];
  childrenByRepeater: Record<string, FormFieldConfig[]>;
  selectedFieldId: string | null;
  dndSensors: ReturnType<typeof useSensors>;
  onSelectField: (id: string) => void;
  onToggleField: (id: string, v: boolean) => void;
  onRemoveField: (id: string) => void;
  onEditSection: (s: SectionConfig) => void;
  onDeleteSection: (id: string) => void;
  onAddField: (sectionId: string, repeaterId?: string) => void;
  onFieldDragEnd: (e: DragEndEvent) => void;
  onRepeaterChildDragEnd: (e: DragEndEvent, repeaterId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = getSectionIcon(section);

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible defaultOpen>
        <Card className="border-border/40 bg-muted/10">
          <CardContent className="p-3 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left min-w-0">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="text-sm font-medium text-foreground flex-1 truncate">{section.label}</h3>
                <Badge variant="secondary" className="text-[10px] shrink-0">{sectionFields.length}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform shrink-0" />
              </CollapsibleTrigger>

              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditSection(section)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                {!section.is_builtin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDeleteSection(section.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onAddField(section.id)}>
                  <Plus className="h-3 w-3" /> Field
                </Button>
              </div>
            </div>

            <CollapsibleContent className="space-y-1.5">
              {sectionFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">No fields in this section</p>
              ) : (
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onFieldDragEnd}>
                  <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {sectionFields.map((field) => (
                      <div key={field.id}>
                        <SortableFieldCard
                          field={field}
                          isSelected={selectedFieldId === field.id}
                          onClick={() => onSelectField(field.id)}
                          onToggleEnabled={(v) => onToggleField(field.id, v)}
                          onRemove={() => onRemoveField(field.id)}
                        />
                        {field.field_type === "repeater" && (
                          <div className="ml-6 mt-1 mb-1 pl-3 border-l-2 border-primary/20 space-y-1">
                            {(childrenByRepeater[field.id] || []).length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic py-1.5">No fields inside this repeater.</p>
                            ) : (
                              <DndContext sensors={dndSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={(e) => onRepeaterChildDragEnd(e, field.id)}>
                                <SortableContext items={(childrenByRepeater[field.id] || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                                  {(childrenByRepeater[field.id] || []).map((child) => (
                                    <SortableFieldCard
                                      key={child.id}
                                      field={child}
                                      isSelected={selectedFieldId === child.id}
                                      onClick={() => onSelectField(child.id)}
                                      onToggleEnabled={(v) => onToggleField(child.id, v)}
                                      onRemove={() => onRemoveField(child.id)}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary" onClick={() => onAddField(field.section || "custom", field.id)}>
                              <Plus className="h-3 w-3" /> Add Field to Repeater
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// ─── Sortable Field Card ────────────────────────────────

function SortableFieldCard({
  field, isSelected, onClick, onToggleEnabled, onRemove,
}: {
  field: FormFieldConfig;
  isSelected: boolean;
  onClick: () => void;
  onToggleEnabled: (v: boolean) => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const locked = field.is_builtin && field.key && LOCKED_KEYS.has(field.key);
  const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : field.enabled
            ? "border-border/40 bg-card/60 hover:border-border"
            : "border-border/20 bg-muted/20 opacity-50"
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

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
  sections,
  onUpdate,
  onClose,
}: {
  field: FormFieldConfig;
  allFields: FormFieldConfig[];
  sections: SectionConfig[];
  onUpdate: (updates: Partial<FormFieldConfig>) => void;
  onClose: () => void;
}) {
  const locked = field.is_builtin && field.key && LOCKED_KEYS.has(field.key);
  const hasOptions = ["dropdown", "radio", "checkbox"].includes(field.field_type);
  const hasValidation = ["short_text", "long_text", "number"].includes(field.field_type);

  const [optionsText, setOptionsText] = useState(
    field.options?.map(o => o.label).join(", ") || ""
  );

  useEffect(() => {
    setOptionsText(field.options?.map(o => o.label).join(", ") || "");
  }, [field.id, field.options]);

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

        {/* Section assignment */}
        <div className="space-y-1.5">
          <Label className="text-xs">Section</Label>
          <Select value={field.section || "custom"} onValueChange={(v) => onUpdate({ section: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parent Repeater assignment */}
        {field.field_type !== "repeater" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Inside Repeater</Label>
            <Select
              value={field.parent_repeater_id || "__none__"}
              onValueChange={(v) => onUpdate({ parent_repeater_id: v === "__none__" ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None (standalone)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (standalone)</SelectItem>
                {allFields.filter(f => f.field_type === "repeater").map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label || "Untitled Repeater"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Place this field inside a repeater so it repeats with each entry.</p>
          </div>
        )}

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
                    value={field.logic?.show_when?.field_id || "__none__"}
                    onValueChange={(v) => onUpdate({
                      logic: v !== "__none__" ? {
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
                      <SelectItem value="__none__">Always show</SelectItem>
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
