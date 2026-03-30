import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────

export type FieldType =
  | "text" | "email" | "phone" | "number" | "url" | "date"
  | "textarea" | "select" | "checkbox" | "radio"
  | "file" | "heading" | "paragraph"
  | "repeater"
  | "level_selector" | "subevent_selector" | "time_slot_selector"
  | "signature" | "rules_acknowledgment";

export interface FormFieldOption {
  label: string;
  value: string;
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
  showWhen?: { fieldKey: string; equals: string };
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
        { id: crypto.randomUUID(), key: "location", label: "Location", type: "text", required: false, placeholder: "City, State", builtin: true },
        { id: crypto.randomUUID(), key: "age_category", label: "Age Category", type: "select", required: true, builtin: true, options: [{ label: "Adult (18+)", value: "adult" }, { label: "Minor (Under 18)", value: "minor" }] },
        { id: crypto.randomUUID(), key: "guardian_name", label: "Guardian Name", type: "text", required: false, placeholder: "Full Name", builtin: true, showWhen: { fieldKey: "age_category", equals: "minor" } },
        { id: crypto.randomUUID(), key: "guardian_email", label: "Guardian Email", type: "email", required: false, builtin: true, showWhen: { fieldKey: "age_category", equals: "minor" } },
        { id: crypto.randomUUID(), key: "guardian_phone", label: "Guardian Phone", type: "phone", required: false, builtin: true, showWhen: { fieldKey: "age_category", equals: "minor" } },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Bio & Media",
      description: "Tell the audience and judges about the performance.",
      fields: [
        { id: crypto.randomUUID(), key: "bio", label: "Biography", type: "textarea", required: false, placeholder: "Share your story or performance background...", builtin: true, columns: 2 },
        { id: crypto.randomUUID(), key: "performance_video_url", label: "Performance Video URL", type: "url", required: false, placeholder: "https://youtube.com/...", description: "Link to a previous performance or audition tape.", builtin: true, columns: 2 },
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
        { id: crypto.randomUUID(), key: "__guardian_signature", label: "Guardian Signature", type: "signature", required: false, builtin: true, showWhen: { fieldKey: "age_category", equals: "minor" }, columns: 2 },
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
      // Config might be stored as the schema array directly, or as an object with form_schema key
      let schema: FormSchema | null = null;
      if (Array.isArray(config) && config.length > 0) {
        schema = config as FormSchema;
      } else if (config && typeof config === "object" && Array.isArray((config as any).sections)) {
        schema = (config as any).sections as FormSchema;
      } else if (config && typeof config === "object" && Array.isArray((config as any).form_schema)) {
        schema = (config as any).form_schema as FormSchema;
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
        .from("registration_form_config" as any)
        .upsert(
          { competition_id: competitionId, form_schema: formSchema, updated_at: new Date().toISOString() } as any,
          { onConflict: "competition_id" }
        )
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
