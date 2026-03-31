// Shared types for the ultimate registration form builder

export interface FormFieldConfig {
  id: string;
  key?: string; // for built-in fields (e.g. "firstName", "email")
  field_type: "short_text" | "long_text" | "email" | "phone" | "url" | "number" | "date" | "time" | "dropdown" | "radio" | "checkbox" | "file" | "signature" | "consent" | "section_header" | "color" | "currency" | "rating" | "toggle" | "hidden" | "divider" | "rich_text" | "repeater" | "category_selector" | "subcategory_selector";
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
  /** If set, this field is a child of the repeater with this ID */
  parent_repeater_id?: string;
}

export interface SectionConfig {
  id: string;
  label: string;
  icon?: string; // icon key for display
  is_builtin: boolean;
  sort_order: number;
}

export interface FormBuilderConfig {
  fields: FormFieldConfig[];
  sections?: SectionConfig[];
  version: number; // schema version for forward compat
}

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "personal", label: "Personal Info", icon: "user", is_builtin: true, sort_order: 0 },
  { id: "bio", label: "Bio & Media", icon: "info", is_builtin: true, sort_order: 1 },
  { id: "event", label: "Event Details", icon: "calendar", is_builtin: true, sort_order: 2 },
  { id: "legal", label: "Legal & Consent", icon: "pen-tool", is_builtin: true, sort_order: 3 },
  { id: "custom", label: "Custom Fields", icon: "plus", is_builtin: true, sort_order: 4 },
];

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
  time: "Time",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  file: "File Upload",
  signature: "Signature",
  consent: "Consent",
  section_header: "Section Header",
  color: "Color Picker",
  currency: "Currency",
  rating: "Rating",
  toggle: "Toggle",
  hidden: "Hidden",
  divider: "Divider",
  rich_text: "Rich Text",
  repeater: "Repeater",
  category_selector: "Category Selector",
  subcategory_selector: "Sub-Category Selector",
};

export const SECTION_LABELS: Record<string, string> = {
  personal: "Personal Info",
  bio: "Bio & Media",
  event: "Event Details",
  legal: "Legal & Consent",
  custom: "Custom Fields",
};

/** Get resolved sections list from a config, falling back to defaults */
export function getConfigSections(config: FormBuilderConfig): SectionConfig[] {
  if (config.sections && config.sections.length > 0) {
    return [...config.sections].sort((a, b) => a.sort_order - b.sort_order);
  }
  return DEFAULT_SECTIONS;
}

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

// --------------- Form Templates ---------------

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  build: () => FormBuilderConfig;
}

function buildSparkTemplate(): FormBuilderConfig {
  let order = 0;
  const repeaterId = "spark_entries_repeater";
  const sections: SectionConfig[] = [
    { id: "school", label: "School Information", icon: "layers", is_builtin: false, sort_order: 0 },
    { id: "applicant", label: "Applicant Information", icon: "user", is_builtin: false, sort_order: 1 },
    { id: "entries", label: "Competition Entries", icon: "layers", is_builtin: false, sort_order: 2 },
    { id: "legal", label: "Legal & Consent", icon: "pen-tool", is_builtin: false, sort_order: 3 },
  ];

  const fields: FormFieldConfig[] = [
    // School Info
    {
      id: `spark_school_name`, field_type: "short_text", label: "Name of School",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "school",
    },
    {
      id: `spark_school_phone`, field_type: "phone", label: "School's Phone Number",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "school",
    },

    // Applicant Info
    {
      id: `spark_applicant_name`, field_type: "short_text", label: "Name of Applicant",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },
    {
      id: `spark_applicant_email`, field_type: "email", label: "Applicant's Email",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },
    {
      id: `spark_applicant_phone`, field_type: "phone", label: "Applicant's Phone Number",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },

    // Competition Entries repeater container
    {
      id: repeaterId, field_type: "repeater", label: "Competition Entries",
      placeholder: "Add Entry", help_text: "Add each performance entry with its category, details, and performer information.",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
    },

    // Repeater child fields
    {
      id: "spark_entry_category", field_type: "category_selector", label: "Category",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_sub_category", field_type: "subcategory_selector", label: "Sub-Category",
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_division", field_type: "dropdown", label: "Division",
      options: [],
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_dance_style", field_type: "short_text", label: "Dance Style",
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_song_title", field_type: "short_text", label: "Song Title",
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_choreographer", field_type: "short_text", label: "Choreographer Name",
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_synopsis", field_type: "long_text", label: "Synopsis / Description",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_video_url", field_type: "url", label: "Performance Video URL",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
    },
    {
      id: "spark_entry_student_name", field_type: "short_text", label: "Student Name",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "equals", value: "solo" } },
    },
    {
      id: "spark_entry_student_name_1", field_type: "short_text", label: "Student Name 1",
      enabled: true, required: true, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "equals", value: "duet" } },
    },
    {
      id: "spark_entry_student_name_2", field_type: "short_text", label: "Student Name 2",
      enabled: true, required: true, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "equals", value: "duet" } },
    },
    {
      id: "spark_entry_group_name", field_type: "short_text", label: "Group Name",
      enabled: true, required: true, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "contains", value: "group" } },
    },
    {
      id: "spark_entry_num_dancers", field_type: "number", label: "Number of Dancers",
      enabled: true, required: false, sort_order: order++, width: "half",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "contains", value: "group" } },
    },
    {
      id: "spark_entry_student_names", field_type: "long_text", label: "Student Names (one per line)",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      parent_repeater_id: repeaterId,
      logic: { show_when: { field_id: "spark_entry_category", operator: "contains", value: "group" } },
    },

    // Legal & Consent
    {
      id: `spark_rules_consent`, field_type: "consent",
      label: "I acknowledge and agree to the competition rules and regulations",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "legal",
    },
    {
      id: `spark_signature`, field_type: "signature", label: "Applicant Signature",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "legal",
    },
  ];

  return { fields, sections, version: 1 };
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "spark_secondary_schools",
    name: "SPARK Secondary Schools",
    description: "School registration with repeater for multiple dance entries (Solo, Duet, Group, Student Choreography) including conditional performer fields.",
    build: buildSparkTemplate,
  },
];
