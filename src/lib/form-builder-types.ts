// Shared types for the ultimate registration form builder

export interface FormFieldConfig {
  id: string;
  key?: string; // for built-in fields (e.g. "firstName", "email")
  field_type: "short_text" | "long_text" | "email" | "phone" | "url" | "number" | "date" | "dropdown" | "radio" | "checkbox" | "file" | "signature" | "consent" | "section_header";
  label: string;
  placeholder?: string;
  help_text?: string;
  enabled: boolean;
  required: boolean;
  sort_order: number;
  width: "full" | "half";
  options?: { label: string; value: string }[];
  validation?: { min_length?: number; max_length?: number; min?: number; max?: number };
  logic?: { show_when?: { field_id: string; operator: "equals" | "not_equals" | "contains" | "not_empty"; value: string } };
  show_on_profile: boolean;
  show_on_scorecard: boolean;
  is_builtin: boolean;
  section?: string;
}

export interface FormBuilderConfig {
  fields: FormFieldConfig[];
  version: number; // schema version for forward compat
}

// Map old config shape → new shape (backwards compat)
export function migrateFormConfig(raw: any): FormBuilderConfig {
  // Already new format
  if (raw?.version && Array.isArray(raw?.fields)) {
    return raw as FormBuilderConfig;
  }

  // Old format: Record<string, { enabled, required }> + _customFields[]
  const fields: FormFieldConfig[] = [];
  let order = 0;

  const oldConfig = raw || {};

  // Built-in fields in canonical order
  const BUILTIN_DEFS: { key: string; label: string; field_type: FormFieldConfig["field_type"]; section: string }[] = [
    { key: "firstName", label: "First Name", field_type: "short_text", section: "personal" },
    { key: "lastName", label: "Last Name", field_type: "short_text", section: "personal" },
    { key: "email", label: "Email", field_type: "email", section: "personal" },
    { key: "phone", label: "Phone", field_type: "phone", section: "personal" },
    { key: "location", label: "Location", field_type: "short_text", section: "personal" },
    { key: "ageCategory", label: "Age Category", field_type: "dropdown", section: "personal" },
    { key: "bio", label: "Biography", field_type: "long_text", section: "bio" },
    { key: "videoUrl", label: "Performance Video URL", field_type: "url", section: "bio" },
    { key: "level", label: "Level", field_type: "dropdown", section: "event" },
    { key: "category", label: "Category", field_type: "dropdown", section: "event" },
    { key: "subCategory", label: "Sub-Category", field_type: "dropdown", section: "event" },
    { key: "subEvent", label: "Sub-Event", field_type: "dropdown", section: "event" },
    { key: "rulesAcknowledged", label: "Rules Acknowledged", field_type: "consent", section: "legal" },
    { key: "contestantSignature", label: "Contestant Signature", field_type: "signature", section: "legal" },
    { key: "guardianName", label: "Guardian Name", field_type: "short_text", section: "legal" },
    { key: "guardianEmail", label: "Guardian Email", field_type: "email", section: "legal" },
    { key: "guardianSignature", label: "Guardian Signature", field_type: "signature", section: "legal" },
  ];

  for (const def of BUILTIN_DEFS) {
    const saved = oldConfig[def.key];
    fields.push({
      id: `builtin_${def.key}`,
      key: def.key,
      field_type: def.field_type,
      label: def.label,
      enabled: saved?.enabled ?? true,
      required: saved?.required ?? false,
      sort_order: order++,
      width: "full",
      show_on_profile: false,
      show_on_scorecard: false,
      is_builtin: true,
      section: def.section,
    });
  }

  // Custom fields
  const customFields: any[] = Array.isArray(oldConfig._customFields) ? oldConfig._customFields : [];
  for (const cf of customFields) {
    const typeMap: Record<string, FormFieldConfig["field_type"]> = {
      text: "short_text",
      textarea: "long_text",
      select: "dropdown",
    };
    fields.push({
      id: cf.id || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      field_type: typeMap[cf.type] || "short_text",
      label: cf.label || "Untitled",
      enabled: cf.enabled ?? true,
      required: cf.required ?? false,
      sort_order: order++,
      width: "full",
      options: cf.options?.map((o: string) => ({ label: o, value: o })),
      show_on_profile: false,
      show_on_scorecard: false,
      is_builtin: false,
    });
  }

  return { fields, version: 1 };
}

export const LOCKED_KEYS = new Set(["firstName", "lastName", "email"]);

export const FIELD_TYPE_LABELS: Record<FormFieldConfig["field_type"], string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  file: "File Upload",
  signature: "Signature",
  consent: "Consent",
  section_header: "Section Header",
};

export const SECTION_LABELS: Record<string, string> = {
  personal: "Personal Info",
  bio: "Bio & Media",
  event: "Event Details",
  legal: "Legal & Consent",
  custom: "Custom Fields",
};

/** Get fields that should be shown on scorecard from a config */
export function getScorecardFields(config: FormBuilderConfig): FormFieldConfig[] {
  return config.fields.filter(f => f.enabled && f.show_on_scorecard && !f.is_builtin);
}

/** Get fields that should be shown on profile from a config */
export function getProfileFields(config: FormBuilderConfig): FormFieldConfig[] {
  return config.fields.filter(f => f.enabled && f.show_on_profile && !f.is_builtin);
}

/** Get enabled custom fields for the registration form */
export function getCustomRegistrationFields(config: FormBuilderConfig): FormFieldConfig[] {
  return config.fields.filter(f => f.enabled && !f.is_builtin);
}
