import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Separator } from "@/components/ui/separator";
import { useLevels, useSubEvents, useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import type { FormSchema, FormField, FormSection } from "@/hooks/useRegistrationForm";
import { BUILTIN_KEYS } from "@/hooks/useRegistrationForm";

interface DynamicRegistrationFormProps {
  formSchema: FormSchema;
  competitionId: string;
  mode: "registration" | "walkin"; // walkin shows all in scrollable, registration uses wizard steps
  onSubmit: (builtinData: Record<string, any>, customData: Record<string, any>) => void | Promise<void>;
  isSubmitting?: boolean;
  initialValues?: Record<string, any>;
}

export function DynamicRegistrationForm({
  formSchema,
  competitionId,
  mode,
  onSubmit,
  isSubmitting,
  initialValues,
}: DynamicRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>(initialValues || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);

  const updateValue = useCallback((key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  // Validate a section's fields
  const validateSection = useCallback((section: FormSection): boolean => {
    const newErrors: Record<string, string> = {};
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    for (const field of fields) {
      if (field.showWhen) {
        const depValue = values[field.showWhen.fieldKey];
        if (depValue !== field.showWhen.equals) continue;
      }
      if (field.required) {
        const val = values[field.key];
        if (val === undefined || val === null || val === "" || val === false) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
      if (field.type === "email" && values[field.key]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values[field.key])) {
          newErrors[field.key] = "Invalid email address";
        }
      }
      if (field.type === "url" && values[field.key]) {
        try { new URL(values[field.key]); } catch { newErrors[field.key] = "Invalid URL"; }
      }
    }
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const handleNext = () => {
    if (validateSection(formSchema[currentStep])) {
      setCurrentStep(s => s + 1);
    }
  };

  const handleSubmit = () => {
    // Validate last section
    if (!validateSection(formSchema[currentStep])) return;
    // Split into builtin and custom
    const builtinData: Record<string, any> = {};
    const customData: Record<string, any> = {};
    for (const [key, val] of Object.entries(values)) {
      if (BUILTIN_KEYS.has(key)) {
        builtinData[key] = val;
      } else {
        customData[key] = val;
      }
    }
    onSubmit(builtinData, customData);
  };

  if (mode === "walkin") {
    const handleWalkinSubmit = () => {
      // Validate ALL sections, not just the current one
      let hasErrors = false;
      for (const section of formSchema) {
        if (!validateSection(section)) hasErrors = true;
      }
      if (hasErrors) return;
      // Split into builtin and custom
      const builtinData: Record<string, any> = {};
      const customData: Record<string, any> = {};
      for (const [key, val] of Object.entries(values)) {
        if (BUILTIN_KEYS.has(key)) {
          builtinData[key] = val;
        } else {
          customData[key] = val;
        }
      }
      onSubmit(builtinData, customData);
    };
    return (
      <WalkinForm
        formSchema={formSchema}
        competitionId={competitionId}
        values={values}
        errors={errors}
        updateValue={updateValue}
        validateSection={validateSection}
        rubric={rubric}
        penalties={penalties}
        onSubmit={handleWalkinSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Wizard mode
  const section = formSchema[currentStep];
  const isLast = currentStep === formSchema.length - 1;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {formSchema.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => i < currentStep && setCurrentStep(i)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all shrink-0 ${
              i === currentStep
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : i < currentStep
                  ? "bg-secondary/20 border-secondary/50 text-secondary cursor-pointer"
                  : "bg-muted/50 border-border text-muted-foreground"
            }`}
          >
            {i < currentStep && <CheckCircle className="h-3 w-3" />}
            <span className="text-xs font-medium">{s.title}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <SectionRenderer
            section={section}
            values={values}
            errors={errors}
            updateValue={updateValue}
            competitionId={competitionId}
            rubric={rubric}
            penalties={penalties}
          />
        </motion.div>
      </AnimatePresence>

      <footer className="flex justify-between pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(s => s - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {!isLast ? (
          <Button type="button" onClick={handleNext}>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Complete Registration"}
          </Button>
        )}
      </footer>
    </div>
  );
}

// ─── Walkin mode: all sections in a single scrollable view ───
function WalkinForm({
  formSchema, competitionId, values, errors, updateValue, validateSection,
  rubric, penalties, onSubmit, isSubmitting,
}: {
  formSchema: FormSchema;
  competitionId: string;
  values: Record<string, any>;
  errors: Record<string, string>;
  updateValue: (k: string, v: any) => void;
  validateSection: (section: FormSection) => boolean;
  rubric: any;
  penalties: any;
  onSubmit: () => void;
  isSubmitting?: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex gap-1.5 pb-2 border-b border-border/50">
        {formSchema.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === currentStep
                ? "bg-primary text-primary-foreground shadow-sm"
                : i < currentStep
                  ? "bg-secondary/20 text-secondary"
                  : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {i < currentStep ? <CheckCircle className="h-3 w-3" /> : null}
            {s.title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={formSchema[currentStep]?.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.15 }}
          className="py-1"
        >
          <SectionRenderer
            section={formSchema[currentStep]}
            values={values}
            errors={errors}
            updateValue={updateValue}
            competitionId={competitionId}
            rubric={rubric}
            penalties={penalties}
            compact
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-3 border-t border-border/50">
        <Button
          type="button" variant="outline" size="sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(s => s - 1)}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        {currentStep < formSchema.length - 1 ? (
          <Button type="button" size="sm" onClick={() => { if (validateSection(formSchema[currentStep])) setCurrentStep(s => s + 1); }}>
            Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Complete Registration"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Section Renderer ───────────────────────────────────

function SectionRenderer({
  section, values, errors, updateValue, competitionId, rubric, penalties, compact,
}: {
  section: FormSection;
  values: Record<string, any>;
  errors: Record<string, string>;
  updateValue: (k: string, v: any) => void;
  competitionId: string;
  rubric?: any[];
  penalties?: any[];
  compact?: boolean;
}) {
  const sectionFields = Array.isArray(section?.fields) ? section.fields : [];
  const visibleFields = sectionFields.filter(f => {
    if (!f.showWhen) return true;
    return values[f.showWhen.fieldKey] === f.showWhen.equals;
  });

  const Wrapper = compact ? "div" : Card;
  const wrapperClass = compact ? "space-y-4" : "border-border/50 bg-card/80 backdrop-blur";

  return (
    <Wrapper className={wrapperClass}>
      {!compact && (
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.description && <CardDescription>{section.description}</CardDescription>}
        </CardHeader>
      )}
      {compact && section.description && (
        <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
      )}
      <div className={compact ? "" : ""}>
        <CardContent className={compact ? "p-0" : "space-y-4"}>
          <div className={`grid gap-3 ${compact ? "" : ""}`} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {visibleFields.map(field => (
              <div key={field.id} style={{ gridColumn: field.columns === 2 ? "1 / -1" : undefined }}>
                <FieldRenderer
                  field={field}
                  value={values[field.key]}
                  error={errors[field.key]}
                  onChange={(v) => updateValue(field.key, v)}
                  values={values}
                  updateValue={updateValue}
                  competitionId={competitionId}
                  rubric={rubric}
                  penalties={penalties}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Wrapper>
  );
}

// ─── Field Renderer ─────────────────────────────────────

function FieldRenderer({
  field, value, error, onChange, values, updateValue, competitionId, rubric, penalties,
}: {
  field: FormField;
  value: any;
  error?: string;
  onChange: (v: any) => void;
  values: Record<string, any>;
  updateValue: (k: string, v: any) => void;
  competitionId: string;
  rubric?: any[];
  penalties?: any[];
}) {
  switch (field.type) {
    case "heading":
      return <h3 className="text-sm font-semibold text-foreground pt-2">{field.label}</h3>;
    case "paragraph":
      return <p className="text-xs text-muted-foreground">{field.description || field.label}</p>;

    case "text":
    case "email":
    case "phone":
    case "url":
    case "date":
    case "number":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Input
            type={field.type === "phone" ? "tel" : field.type}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={e => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
            maxLength={field.maxLength}
            min={field.min}
            max={field.max}
          />
          {field.description && <p className="text-[10px] text-muted-foreground italic">{field.description}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Textarea
            placeholder={field.placeholder}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={field.maxLength}
          />
          {field.description && <p className="text-[10px] text-muted-foreground italic">{field.description}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "radio":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <div className="flex flex-wrap gap-2">
            {field.options?.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                  value === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id={field.id}
            checked={!!value}
            onCheckedChange={v => onChange(!!v)}
          />
          <Label htmlFor={field.id} className="text-xs text-muted-foreground leading-snug cursor-pointer">
            {field.label}{field.required && " *"}
          </Label>
          {error && <p className="text-xs text-destructive ml-6">{error}</p>}
        </div>
      );

    case "file":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Input type="file" accept={field.accept} onChange={e => onChange(e.target.files?.[0])} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "repeater":
      return (
        <RepeaterField
          field={field}
          value={value || []}
          onChange={onChange}
          error={error}
          competitionId={competitionId}
        />
      );

    case "level_selector":
      return <LevelSelectorField competitionId={competitionId} value={values.__level_selector_value || values.selectedLevelId} onChange={v => { onChange(v); updateValue("selectedLevelId", v); updateValue("__level_selector_value", v); updateValue("__subevent_selector", ""); updateValue("selectedSubEventId", ""); updateValue("__category_selector", ""); updateValue("selectedCategoryId", ""); updateValue("__subcategory_selector", ""); updateValue("selectedSubCategoryId", ""); updateValue("__deepest_category_id", ""); for (let d = 0; d < 10; d++) updateValue(`__cat_depth_${d}`, ""); }} error={error} field={field} />;

    case "subevent_selector":
      return <SubEventSelectorField competitionId={competitionId} levelId={values.__level_selector_value || values.selectedLevelId} value={value} onChange={v => { onChange(v); updateValue("selectedSubEventId", v); }} error={error} field={field} />;

    case "category_selector":
      return <CategoryTreeSelector
        levelId={values.__level_selector_value || values.selectedLevelId}
        values={values}
        updateValue={updateValue}
        error={error}
        field={field}
      />;

    case "subcategory_selector":
      // Handled by CategoryTreeSelector above — render nothing to avoid duplication
      return (values.__level_selector_value || values.selectedLevelId) ? null : null;

    case "time_slot_selector":
      return <TimeSlotSelectorField subEventId={values.__subevent_selector || values.selectedSubEventId} value={value} onChange={v => { onChange(v); updateValue("selectedSlotId", v); }} error={error} field={field} />;

    case "rules_acknowledgment":
      return <RulesAcknowledgment value={value} onChange={onChange} rubric={rubric} penalties={penalties} error={error} />;

    case "signature":
      return (
        <div className="space-y-1.5">
          <SignaturePad label={field.label + (field.required ? " *" : "")} onSignature={onChange} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "time":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Input type="time" value={value || ""} onChange={e => onChange(e.target.value)} />
          {field.description && <p className="text-[10px] text-muted-foreground italic">{field.description}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "color":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "currency":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input type="number" step="0.01" min={0} placeholder="0.00" value={value || ""} onChange={e => onChange(e.target.value)} className="pl-7" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "rating":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`h-8 w-8 rounded-full border text-sm font-medium transition-all ${
                  value === n ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                }`}
              >{n}</button>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center gap-3 pt-1">
          <Switch checked={!!value} onCheckedChange={v => onChange(v)} />
          <Label className="text-xs cursor-pointer">{field.label}{field.required && " *"}</Label>
          {error && <p className="text-xs text-destructive ml-2">{error}</p>}
        </div>
      );

    case "hidden":
      return null;

    case "divider":
      return <Separator className="my-2" />;

    case "consent":
      return (
        <div className="flex items-start gap-2 pt-1">
          <Checkbox id={field.id} checked={!!value} onCheckedChange={v => onChange(!!v)} />
          <Label htmlFor={field.id} className="text-xs text-muted-foreground leading-snug cursor-pointer">
            {field.description || field.label}{field.required && " *"}
          </Label>
          {error && <p className="text-xs text-destructive ml-6">{error}</p>}
        </div>
      );

    case "rich_text":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}{field.required && " *"}</Label>
          <Textarea
            placeholder={field.placeholder}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className="min-h-[120px]"
          />
          {field.description && <p className="text-[10px] text-muted-foreground italic">{field.description}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground">Unknown field type: {field.type}</p>;
  }
}

// ─── Repeater Field ─────────────────────────────────────

function RepeaterField({ field, value, onChange, error, competitionId }: {
  field: FormField; value: any[]; onChange: (v: any[]) => void; error?: string; competitionId: string;
}) {
  const rows = Array.isArray(value) ? value : [];
  const canAdd = !field.repeaterMax || rows.length < field.repeaterMax;
  const canRemove = !field.repeaterMin || rows.length > field.repeaterMin;

  const addRow = () => {
    const emptyRow: Record<string, any> = {};
    field.repeaterFields?.forEach(f => (emptyRow[f.key] = ""));
    onChange([...rows, emptyRow]);
  };

  const updateRow = (idx: number, key: string, val: any) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{field.label}{field.required && " *"}</Label>
      {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}

      {rows.map((row, idx) => (
        <div key={idx} className="p-3 border border-border/50 rounded-lg bg-muted/10 space-y-2 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
            {canRemove && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field.repeaterFields?.filter(subField => {
              if (!subField.showWhen) return true;
              const depVal = row[subField.showWhen.fieldKey] || "";
              return depVal === subField.showWhen.equals || depVal.includes(subField.showWhen.equals);
            }).map(subField => (
              <div key={subField.key} style={{ gridColumn: subField.columns === 2 ? "1 / -1" : undefined }}>
                <Label className="text-[10px]">{subField.label}</Label>
                {subField.type === "level_selector" ? (
                  <RepeaterLevelButtons
                    row={row} idx={idx} subField={subField}
                    competitionId={(field as any)._competitionId || ""}
                    updateRow={updateRow}
                  />
                ) : subField.type === "category_selector" ? (
                  <RepeaterCategoryButtons
                    row={row} idx={idx} subField={subField}
                    competitionId={(field as any)._competitionId || ""}
                    levelId={row.__level_id || ""}
                    updateRow={updateRow}
                  />
                
                ) : subField.type === "subcategory_selector" ? (
                  <RepeaterSubCategoryButtons
                    row={row} idx={idx} subField={subField}
                    levelId={row.__level_id || ""}
                    parentCategoryId={row[subField.key.replace("sub_category", "category")] || row["spark_entry_category"] || ""}
                    updateRow={updateRow}
                  />
                ) : subField.type === "name_list" ? (
                  <NameListField
                    value={row[subField.key] || []}
                    onChange={(v) => updateRow(idx, subField.key, v)}
                    placeholder={subField.placeholder}
                  />
                ) : subField.type === "textarea" ? (
                  <Textarea
                    placeholder={subField.placeholder}
                    value={row[subField.key] || ""}
                    onChange={e => updateRow(idx, subField.key, e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                ) : subField.type === "select" || subField.type === "radio" ? (
                  <Select value={row[subField.key] || ""} onValueChange={v => updateRow(idx, subField.key, v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {subField.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : subField.type === "checkbox" || subField.type === "toggle" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={!!row[subField.key]} onCheckedChange={v => updateRow(idx, subField.key, v)} />
                  </div>
                ) : subField.type === "consent" ? (
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox checked={!!row[subField.key]} onCheckedChange={v => updateRow(idx, subField.key, !!v)} />
                    <span className="text-xs text-muted-foreground">{subField.description || subField.label}</span>
                  </div>
                ) : subField.type === "rating" ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => updateRow(idx, subField.key, n)}
                        className={`h-7 w-7 rounded-full border text-xs font-medium transition-all ${
                          row[subField.key] === n ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >{n}</button>
                    ))}
                  </div>
                ) : subField.type === "file" ? (
                  <Input type="file" accept={subField.accept} onChange={e => updateRow(idx, subField.key, e.target.files?.[0])} className="h-8 text-sm" />
                ) : (
                  <Input
                    type={subField.type === "number" ? "number" : subField.type === "email" ? "email" : subField.type === "phone" ? "tel" : subField.type === "url" ? "url" : subField.type === "date" ? "date" : "text"}
                    placeholder={subField.placeholder}
                    value={row[subField.key] || ""}
                    onChange={e => updateRow(idx, subField.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {canAdd && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full border-dashed">
          <Plus className="h-3 w-3 mr-1" /> {field.repeaterLabel || "Add Entry"}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Repeater Sub-Components ────────────────────────────

function RepeaterLevelButtons({ row, idx, subField, competitionId, updateRow }: {
  row: Record<string, any>; idx: number; subField: FormField;
  competitionId: string; updateRow: (idx: number, key: string, val: any) => void;
}) {
  const { data: levels } = useLevels(competitionId);

  if (!levels || levels.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No levels configured.</p>;
  }

  const selected = row.__level_id || row[subField.key] || "";

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {levels.map(l => (
        <button
          key={l.id}
          type="button"
          onClick={() => {
            updateRow(idx, subField.key, l.id);
            updateRow(idx, "__level_id", l.id);
            // Clear dependent selectors when level changes
            updateRow(idx, "spark_entry_category", "");
            updateRow(idx, "spark_entry_sub_category", "");
          }}
          className={`px-2.5 py-1 rounded-md border text-xs transition-all ${
            selected === l.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
          }`}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}

function RepeaterCategoryButtons({ row, idx, subField, competitionId, levelId, updateRow }: {
  row: Record<string, any>; idx: number; subField: FormField;
  competitionId: string; levelId: string; updateRow: (idx: number, key: string, val: any) => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ["competition_categories_children", `root_${levelId}`],
    enabled: !!levelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", levelId)
        .is("parent_id", null)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  if (!categories || categories.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No categories configured.</p>;
  }

  const selected = row[subField.key] || "";

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => {
            updateRow(idx, subField.key, cat.id);
            // Clear sub-category when category changes
            updateRow(idx, "spark_entry_sub_category", "");
          }}
          className={`px-2.5 py-1 rounded-md border text-xs transition-all ${
            selected === cat.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function RepeaterSubCategoryButtons({ row, idx, subField, levelId, parentCategoryId, updateRow }: {
  row: Record<string, any>; idx: number; subField: FormField;
  levelId: string; parentCategoryId: string; updateRow: (idx: number, key: string, val: any) => void;
}) {
  const { data: subcategories } = useQuery({
    queryKey: ["competition_categories_children", parentCategoryId],
    enabled: !!parentCategoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", levelId)
        .eq("parent_id", parentCategoryId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  if (!parentCategoryId) return <p className="text-[10px] text-muted-foreground">Select a category first.</p>;
  if (!subcategories || subcategories.length === 0) return null;

  const selected = row[subField.key] || "";

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {subcategories.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => updateRow(idx, subField.key, cat.id)}
          className={`px-2.5 py-1 rounded-md border text-xs transition-all ${
            selected === cat.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function NameListField({ value, onChange, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => onChange([...items, ""]);
  const updateItem = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            placeholder={placeholder || `Name ${i + 1}`}
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeItem(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full border-dashed h-7 text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Name
      </Button>
    </div>
  );
}

// ─── Built-in Special Fields ────────────────────────────

function LevelSelectorField({ competitionId, value, onChange, error, field }: {
  competitionId: string; value: any; onChange: (v: string) => void; error?: string; field: FormField;
}) {
  const { data: levels } = useLevels(competitionId);
  if (!levels || levels.length === 0) return <p className="text-xs text-muted-foreground">No levels configured.</p>;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}{field.required && " *"}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {levels.map(l => (
          <button
            key={l.id} type="button"
            onClick={() => onChange(l.id)}
            className={`px-3 py-2 rounded-md border text-sm transition-all ${
              value === l.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubEventSelectorField({ competitionId, levelId, value, onChange, error, field }: {
  competitionId: string; levelId?: string; value: any; onChange: (v: string) => void; error?: string; field: FormField;
}) {
  const { data: subEvents } = useSubEvents(levelId || undefined);

  if (!levelId) return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <div className="py-6 text-center bg-muted/20 rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">Select a level first.</p>
      </div>
    </div>
  );

  if (!subEvents || subEvents.length === 0) return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <div className="py-6 text-center bg-muted/20 rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">No sessions available for this level.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}{field.required && " *"}</Label>
      <div className="grid gap-2">
        {subEvents.map(se => (
          <button
            key={se.id} type="button"
            onClick={() => onChange(se.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              value === se.id
                ? "bg-primary/5 border-primary ring-1 ring-primary"
                : "bg-card border-border/50 hover:border-border"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-sm uppercase tracking-tight">{se.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {se.event_date || "TBA"} • {se.start_time || "TBA"}
                </p>
              </div>
              {value === se.id && (
                <Badge variant="default" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


// ─── Recursive Category Tree Selector ───────────────────
// Drills down through arbitrary depth of competition_categories hierarchy

function CategoryLevelPicker({ parentId, levelId, depth, values, updateValue }: {
  parentId: string | null;
  levelId: string;
  depth: number;
  values: Record<string, any>;
  updateValue: (k: string, v: any) => void;
}) {
  const { data: children } = useQuery({
    queryKey: ["competition_categories_children", parentId || `root_${levelId}`],
    enabled: !!levelId,
    queryFn: async () => {
      let query = supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", levelId)
        .order("sort_order");
      if (parentId) {
        query = query.eq("parent_id", parentId);
      } else {
        query = query.is("parent_id", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  if (!children || children.length === 0) return null;

  const stateKey = `__cat_depth_${depth}`;
  const selectedId = values[stateKey] || "";

  const handleChange = (id: string) => {
    updateValue(stateKey, id);
    // Clear all deeper selections
    for (let d = depth + 1; d < 10; d++) {
      const key = `__cat_depth_${d}`;
      if (values[key]) updateValue(key, "");
      else break;
    }
    // Always update the canonical keys for submission
    if (depth === 0) {
      updateValue("__category_selector", id);
      updateValue("selectedCategoryId", id);
      updateValue("__subcategory_selector", "");
      updateValue("selectedSubCategoryId", "");
    } else if (depth === 1) {
      updateValue("__subcategory_selector", id);
      updateValue("selectedSubCategoryId", id);
    }
    // For deeper levels, store in a generic key
    updateValue("__deepest_category_id", id);
  };

  // Determine label based on depth
  const labels = ["Category", "Sub-Category", "Division", "Age Group", "Selection"];
  const label = labels[depth] || `Level ${depth + 1}`;

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="flex flex-wrap gap-1.5">
          {children.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleChange(cat.id)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                selectedId === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      {selectedId && (
        <CategoryLevelPicker
          parentId={selectedId}
          levelId={levelId}
          depth={depth + 1}
          values={values}
          updateValue={updateValue}
        />
      )}
    </>
  );
}

function CategoryTreeSelector({ levelId, values, updateValue, error, field }: {
  levelId?: string;
  values: Record<string, any>;
  updateValue: (k: string, v: any) => void;
  error?: string;
  field: FormField;
}) {
  if (!levelId) return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <div className="py-6 text-center bg-muted/20 rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">Select a level first.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <CategoryLevelPicker
        parentId={null}
        levelId={levelId}
        depth={0}
        values={values}
        updateValue={updateValue}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


function TimeSlotSelectorField({ subEventId, value, onChange, error, field }: {
  subEventId?: string; value: any; onChange: (v: string) => void; error?: string; field: FormField;
}) {
  const { data: slots } = useQuery({
    queryKey: ["performance-slots", subEventId],
    enabled: !!subEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("*")
        .eq("sub_event_id", subEventId!)
        .order("slot_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (!subEventId) return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <p className="text-xs text-muted-foreground text-center py-4">Select a session first.</p>
    </div>
  );

  const available = slots?.filter(s => !s.is_booked) || [];

  if (!slots || slots.length === 0) return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <p className="text-xs text-muted-foreground text-center py-4">No time slots available. You may skip this step.</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {available.map(slot => (
          <button
            key={slot.id} type="button"
            onClick={() => onChange(slot.id === value ? "" : slot.id)}
            className={`text-center border rounded-md p-2 transition-colors text-sm font-mono ${
              slot.id === value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border/50 bg-muted/20 hover:bg-muted/40 text-foreground"
            }`}
          >
            {formatTime(slot.start_time)}
          </button>
        ))}
      </div>
      {available.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">All slots are booked.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RulesAcknowledgment({ value, onChange, rubric, penalties, error }: {
  value: any; onChange: (v: boolean) => void; rubric?: any[]; penalties?: any[]; error?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Scoring Rubric</h4>
          <ul className="space-y-1">
            {rubric?.map(r => (
              <li key={r.id} className="text-xs flex justify-between">
                <span>{r.name}</span>
                <span className="opacity-50 font-mono">1-5pts</span>
              </li>
            ))}
            {(!rubric || rubric.length === 0) && <li className="text-xs text-muted-foreground italic">No rubric configured.</li>}
          </ul>
        </div>
        <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-2">Penalties</h4>
          <ul className="space-y-1">
            {penalties?.map(p => (
              <li key={p.id} className="text-xs flex justify-between">
                <span>{p.from_seconds}s - {p.to_seconds || "∞"}s</span>
                <span className="text-destructive font-mono">-{p.penalty_points}</span>
              </li>
            ))}
            {(!penalties || penalties.length === 0) && <li className="text-xs text-muted-foreground italic">No penalty rules.</li>}
          </ul>
        </div>
      </div>
      <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
        <Checkbox id="rules-ack" checked={!!value} onCheckedChange={v => onChange(!!v)} />
        <label htmlFor="rules-ack" className="text-sm leading-tight cursor-pointer">
          I acknowledge that I have read the competition rules and agree to the scoring system and penalties.
        </label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
