import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────

export type FieldType =
  | "text" | "email" | "phone" | "number" | "url" | "date" | "time"
  | "textarea" | "select" | "checkbox" | "radio"
  | "file" | "heading" | "paragraph"
  | "repeater"
  | "level_selector" | "subevent_selector" | "time_slot_selector"
  | "category_selector" | "subcategory_selector"
  | "signature" | "rules_acknowledgment"
  | "color" | "currency" | "rating" | "toggle" | "hidden" | "divider" | "consent" | "rich_text"
  | "name_list";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface ShowWhenCondition {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "not_empty";
  value?: string;
}

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
  builtin?: boolean;
  options?: FormFieldOption[];    // for select / radio
  accept?: string;               // for file
  maxLength?: number;            // for text / textarea
  min?: number;                  // for number
  max?: number;                  // for number
  columns?: number;              // grid cols 1|2
  // Repeater fields
  repeaterFields?: FormField[];  // sub-fields for repeater rows
  repeaterMin?: number;
  repeaterMax?: number;
  repeaterLabel?: string;        // label for "Add" button e.g. "Add Team Member"
  // Conditional visibility
  showWhen?: ShowWhenCondition;
}

/** Normalize a string for fuzzy comparison: lowercase, trim, collapse whitespace, strip punctuation */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_\-/]+/g, " ").replace(/[^a-z0-9 ]/g, "");
}

/** Evaluate a showWhen condition against a values bag */
export function evaluateShowWhen(
  condition: ShowWhenCondition | undefined,
  valuesBag: Record<string, any>,
): boolean {
  if (!condition) return true;
  const raw = valuesBag[condition.fieldKey];
  const nameKey = `${condition.fieldKey}__name`;
  const nameVal = valuesBag[nameKey];

  /** Check if any of the candidate values match the target (exact or normalized) */
  const matches = (target: string): boolean => {
    const nt = norm(target);
    const candidates = [raw, nameVal];
    for (const c of candidates) {
      if (c === target) return true;
      if (typeof c === "string" && (norm(c) === nt || norm(c).includes(nt) || nt.includes(norm(c)))) return true;
      if (Array.isArray(c) && c.some(v => v === target || (typeof v === "string" && norm(v) === nt))) return true;
    }
    return false;
  };

  switch (condition.operator) {
    case "equals":
      return matches(condition.value ?? "");
    case "not_equals":
      return !matches(condition.value ?? "");
    case "contains": {
      const target = condition.value ?? "";
      const nt = norm(target);
      return (typeof raw === "string" && norm(raw).includes(nt)) ||
        (typeof nameVal === "string" && norm(nameVal).includes(nt)) ||
        (Array.isArray(raw) && raw.some(v => typeof v === "string" && norm(v).includes(nt)));
    }
    case "not_empty":
      return raw !== undefined && raw !== null && raw !== "" && raw !== false;
    default:
      return true;
  }
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export type FormSchema = FormSection[];

// ─── Built-in field key → column mapping ──────────────

export const BUILTIN_KEYS = new Set([
  "full_name", "email", "phone", "location", "age_category",
  "bio", "performance_video_url", "profile_photo_url",
  "guardian_name", "guardian_email", "guardian_phone",
  "__level_selector", "__subevent_selector", "__time_slot_selector",
  "__category_selector", "__subcategory_selector",
  "__rules_acknowledgment", "__contestant_signature", "__guardian_signature",
]);

// ─── Default form template ─────────────────────────────

export function createDefaultFormSchema(): FormSchema {
  return [
    {
      id: crypto.randomUUID(),
      title: "Personal Information",
      description: "Basic details for the competition organizers.",
      fields: [
        { id: crypto.randomUUID(), key: "full_name", label: "Full Name", type: "text", required: true, placeholder: "Legal Name", builtin: true, columns: 2 },
        { id: crypto.randomUUID(), key: "email", label: "Email", type: "email", required: true, placeholder: "john@example.com", builtin: true },
        { id: crypto.randomUUID(), key: "phone", label: "Phone", type: "phone", required: false, placeholder: "+1...", builtin: true },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Event Selection",
      description: "Choose the level and session to compete in.",
      fields: [
        { id: crypto.randomUUID(), key: "__level_selector", label: "Competition Level / Stage", type: "level_selector", required: true, builtin: true, columns: 2 },
        { id: crypto.randomUUID(), key: "__subevent_selector", label: "Available Sessions", type: "subevent_selector", required: true, builtin: true, columns: 2 },
        { id: crypto.randomUUID(), key: "__time_slot_selector", label: "Time Slot", type: "time_slot_selector", required: false, builtin: true, columns: 2 },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Legal & Certification",
      description: "Review the rules and sign to complete registration.",
      fields: [
        { id: crypto.randomUUID(), key: "__rules_acknowledgment", label: "Rules Acknowledgment", type: "rules_acknowledgment", required: true, builtin: true, columns: 2 },
        { id: crypto.randomUUID(), key: "__contestant_signature", label: "Contestant Signature", type: "signature", required: true, builtin: true, columns: 2 },
      ],
    },
  ];
}

// ─── Hooks ──────────────────────────────────────────────

export function useRegistrationFormConfig(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["registration_form_config", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, registration_form_config")
        .eq("id", competitionId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const config = data.registration_form_config as any;
      let schema: FormSchema | null = null;

      // Format A: Already an array of sections with embedded fields (FormSchema)
      if (Array.isArray(config) && config.length > 0 && config[0].fields) {
        schema = config as FormSchema;
      }
      // Format B: { form_schema: FormSchema }
      else if (config?.form_schema && Array.isArray(config.form_schema)) {
        schema = config.form_schema as FormSchema;
      }
      // Format C: Flat format { sections: [{id, label}], fields: [{section, ...}] }
      else if (config?.sections && Array.isArray(config.sections) && config?.fields && Array.isArray(config.fields)) {
        const enabledFields = config.fields.filter((f: any) => f.enabled !== false);
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
        // Map flat DB builtin keys → standard builtin keys used by DynamicRegistrationForm
        const builtinKeyMap: Record<string, string> = {
          firstName: "full_name",       // will be combined with lastName
          lastName: "__lastName",        // helper key, merged into full_name
          email: "email",
          phone: "phone",
          location: "location",
          ageCategory: "age_category",
          bio: "bio",
          videoUrl: "performance_video_url",
          guardianName: "guardian_name",
          guardianEmail: "guardian_email",
          guardianPhone: "guardian_phone",
          level: "__level_selector",
          category: "__category_selector",
          subCategory: "__subcategory_selector",
          subEvent: "__subevent_selector",
          rulesAcknowledged: "__rules_acknowledgment",
          contestantSignature: "__contestant_signature",
          guardianSignature: "__guardian_signature",
        };
        schema = config.sections
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((sec: any) => {
            const sectionFields = enabledFields
              .filter((f: any) => f.section === sec.id)
              .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((f: any) => {
                const rawKey = f.key || f.id?.replace("builtin_", "") || f.id;
                const mappedKey = f.is_builtin ? (builtinKeyMap[rawKey] || rawKey) : rawKey;
                const isBuiltin = f.is_builtin && BUILTIN_KEYS.has(mappedKey);
                // Override field type for special builtin selectors
                const specialTypeMap: Record<string, FieldType> = {
                  "__level_selector": "level_selector",
                  "__subevent_selector": "subevent_selector",
                  "__category_selector": "category_selector",
                  "__subcategory_selector": "subcategory_selector",
                  "__time_slot_selector": "time_slot_selector",
                  "__rules_acknowledgment": "rules_acknowledgment",
                  "__contestant_signature": "signature",
                  "__guardian_signature": "signature",
                };
                const fieldType = specialTypeMap[mappedKey] || fieldTypeMap[f.field_type] || "text";
                const built: FormField = {
                  id: f.id,
                  key: mappedKey,
                  label: f.label,
                  type: fieldType,
                  required: !!f.required,
                  placeholder: f.help_text || "",
                  description: f.help_text || "",
                  builtin: isBuiltin,
                  columns: f.width === "half" ? 1 : 2,
                  options: f.options?.map((o: any) => typeof o === "string" ? { label: o, value: o } : o),
                  show_on_profile: f.show_on_profile,
                  show_on_scorecard: f.show_on_scorecard,
                } as FormField;
                // Map top-level conditional logic
                if (f.logic?.show_when) {
                  const sw = f.logic.show_when;
                  const targetField = enabledFields.find((tf: any) => tf.id === sw.field_id);
                  if (targetField) {
                    const tRawKey = targetField.key || targetField.id?.replace("builtin_", "") || targetField.id;
                    const tMappedKey = targetField.is_builtin ? (builtinKeyMap[tRawKey] || tRawKey) : tRawKey;
                    built.showWhen = { fieldKey: tMappedKey, operator: sw.operator || "equals", value: sw.value };
                  }
                }
                return built;
              });
            return {
              id: sec.id,
              title: sec.label || sec.id,
              description: sec.description || "",
              fields: sectionFields,
            } as FormSection;
          })
          .filter((s: FormSection) => s.fields.length > 0);

        // Post-process: group children with parent_repeater_id into parent's repeaterFields
        if (schema) {
          for (const section of schema) {
            const repeaters = section.fields.filter(f => f.type === "repeater");
            for (const rep of repeaters) {
              const children = section.fields.filter(f => {
                const raw = config.fields.find((cf: any) => cf.id === f.id);
                return raw?.parent_repeater_id === config.fields.find((cf: any) => cf.id === rep.id)?.id;
              });
              if (children.length > 0) {
                // Build a lookup from raw field id → mapped key so showWhen can reference siblings
                const idToKey = new Map<string, string>();
                for (const c of children) {
                  idToKey.set(c.id, c.key);
                }

                rep.repeaterFields = children.map(c => {
                  const rawField = config.fields.find((cf: any) => cf.id === c.id);
                  if (rawField?.logic?.show_when) {
                    const sw = rawField.logic.show_when;
                    // Resolve the target field's mapped key using our pre-built lookup
                    const targetKey = idToKey.get(sw.field_id) || sw.field_id;
                    if (sw.operator === "equals" || sw.operator === "contains") {
                      c.showWhen = { fieldKey: targetKey, operator: sw.operator, value: sw.value };
                    }
                  }
                  return c;
                });
                rep.repeaterLabel = rep.placeholder || "Add Entry";
                // Remove children from section's flat list
                const childIds = new Set(children.map(c => c.id));
                section.fields = section.fields.filter(f => !childIds.has(f.id));
              }
            }
          }
        }
      }

      if (!schema || schema.length === 0) return null;
      return {
        id: data.id,
        competition_id: data.id,
        form_schema: schema,
      };
    },
  });
}

export function useUpsertFormConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ competitionId, formSchema }: { competitionId: string; formSchema: FormSchema }) => {
      const { data, error } = await supabase
        .from("competitions")
        .update({ registration_form_config: formSchema as any, updated_at: new Date().toISOString() })
        .eq("id", competitionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["registration_form_config", vars.competitionId] });
    },
  });
}

// ─── Advancement hooks ────────────────────────────────

export interface ContestantAdvancement {
  id: string;
  registration_id: string;
  from_sub_event_id: string | null;
  to_sub_event_id: string;
  advanced_by: string;
  advanced_at: string;
  notes: string | null;
}

export function useContestantAdvancements(registrationIds: string[]) {
  return useQuery({
    queryKey: ["contestant_advancements", registrationIds],
    enabled: registrationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_advancements" as any)
        .select("*")
        .in("registration_id", registrationIds)
        .order("advanced_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ContestantAdvancement[];
    },
  });
}

export function useCreateAdvancement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (advancement: {
      registration_id: string;
      from_sub_event_id: string | null;
      to_sub_event_id: string;
      advanced_by: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("contestant_advancements" as any)
        .insert(advancement as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contestant_advancements"] });
    },
  });
}
