// Shared types for the ultimate registration form builder

export interface FormFieldConfig {
  id: string;
  key?: string; // for built-in fields (e.g. "firstName", "email")
  field_type: "short_text" | "long_text" | "email" | "phone" | "url" | "number" | "date" | "time" | "dropdown" | "radio" | "checkbox" | "file" | "signature" | "consent" | "section_header" | "color" | "currency" | "rating" | "toggle" | "hidden" | "divider" | "rich_text" | "repeater";
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
  const sections: SectionConfig[] = [
    { id: "school", label: "School Information", icon: "layers", is_builtin: false, sort_order: 0 },
    { id: "applicant", label: "Applicant Information", icon: "user", is_builtin: false, sort_order: 1 },
    { id: "entries", label: "Competition Entries", icon: "layers", is_builtin: false, sort_order: 2 },
    { id: "legal", label: "Legal & Consent", icon: "pen-tool", is_builtin: false, sort_order: 3 },
  ];

  const fields: FormFieldConfig[] = [
    // School Info
    {
      id: `spark_school_name`, key: undefined, field_type: "short_text", label: "Name of School",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "school",
    },
    {
      id: `spark_school_phone`, key: undefined, field_type: "phone", label: "School's Phone Number",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "school",
    },

    // Applicant Info
    {
      id: `spark_applicant_name`, key: undefined, field_type: "short_text", label: "Name of Applicant",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },
    {
      id: `spark_applicant_email`, key: undefined, field_type: "email", label: "Applicant's Email",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },
    {
      id: `spark_applicant_phone`, key: undefined, field_type: "phone", label: "Applicant's Phone Number",
      enabled: true, required: false, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "applicant",
    },

    // Competition Entries (repeater)
    {
      id: `spark_entries_repeater`, key: undefined, field_type: "repeater", label: "Competition Entries",
      placeholder: "Add Entry", help_text: "Add each performance entry with its category, details, and performer information.",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "entries",
      options: undefined,
      validation: undefined,
      // Sub-fields stored in a custom property — the repeater renderer reads this
      sub_fields: [
        { key: "category", label: "Category", type: "select", required: true, options: ["Solo", "Duet", "Group", "Student Choreography"] },
        { key: "sub_category", label: "Sub-Category", type: "select", required: false, options: [] },
        { key: "division", label: "Division", type: "select", required: false, options: [] },
        { key: "dance_style", label: "Dance Style", type: "text", required: false },
        { key: "song_title", label: "Song Title", type: "text", required: false },
        { key: "choreographer", label: "Choreographer Name", type: "text", required: false },
        { key: "synopsis", label: "Synopsis / Description", type: "textarea", required: false },
        { key: "video_url", label: "Performance Video URL", type: "url", required: false },
        // Conditional: Solo
        { key: "student_name", label: "Student Name", type: "text", required: true, showWhen: { fieldKey: "category", operator: "equals", value: "Solo" } },
        // Conditional: Duet
        { key: "student_name_1", label: "Student Name 1", type: "text", required: true, showWhen: { fieldKey: "category", operator: "equals", value: "Duet" } },
        { key: "student_name_2", label: "Student Name 2", type: "text", required: true, showWhen: { fieldKey: "category", operator: "equals", value: "Duet" } },
        // Conditional: Group / Student Choreography
        { key: "group_name", label: "Group Name", type: "text", required: true, showWhen: { fieldKey: "category", operator: "contains", value: "Group" } },
        { key: "number_of_dancers", label: "Number of Dancers", type: "number", required: false, showWhen: { fieldKey: "category", operator: "contains", value: "Group" } },
        { key: "student_names", label: "Student Names (one per line)", type: "textarea", required: true, showWhen: { fieldKey: "category", operator: "contains", value: "Group" } },
        // Student Choreography also shows group fields (contains "Group" won't match "Student Choreography"), so add explicit entries
        { key: "group_name_sc", label: "Group Name", type: "text", required: true, showWhen: { fieldKey: "category", operator: "equals", value: "Student Choreography" } },
        { key: "number_of_dancers_sc", label: "Number of Dancers", type: "number", required: false, showWhen: { fieldKey: "category", operator: "equals", value: "Student Choreography" } },
        { key: "student_names_sc", label: "Student Names (one per line)", type: "textarea", required: true, showWhen: { fieldKey: "category", operator: "equals", value: "Student Choreography" } },
      ],
    } as any,

    // Legal & Consent
    {
      id: `spark_rules_consent`, key: undefined, field_type: "consent",
      label: "I acknowledge and agree to the competition rules and regulations",
      enabled: true, required: true, sort_order: order++, width: "full",
      show_on_profile: false, show_on_scorecard: false, is_builtin: false, section: "legal",
    },
    {
      id: `spark_signature`, key: undefined, field_type: "signature", label: "Applicant Signature",
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
