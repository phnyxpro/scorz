

# Ultimate Registration Form Editor

## Overview
Transform the current simple toggle-based registration form editor (`RegistrationFormsInline`) into a full drag-and-drop form builder inspired by iSD Health Solutions and Mission CTRL. Add visibility flags so organisers can control which fields appear on contestant profiles and judge score cards.

## Current State
- `RegistrationFormsInline.tsx` has hardcoded sections (Personal, Bio, Event, Legal) with toggle/required switches
- Custom fields support only 3 types: text, textarea, select
- No drag-and-drop, no field properties panel, no conditional logic
- Custom field values stored in `contestant_registrations.custom_field_values` (JSONB) — no schema change needed
- Config stored in `competitions.registration_form_config` (JSONB) — no schema change needed

## Architecture Decision: No DB Migration
All form configuration will continue to live in `registration_form_config` JSONB. The enhanced field definitions (with visibility flags, validation, conditional logic) fit naturally in this column. No new tables needed — this keeps it simpler than Mission CTRL's separate `form_fields` table approach since each competition has exactly one registration form.

## Changes

### 1. Rewrite `RegistrationFormsInline.tsx` as a full form builder

Replace the toggle-list UI with a two-panel builder layout:

**Left panel — Field canvas:**
- Draggable field cards showing label, type badge, required indicator, visibility badges
- "Add Field" button opens a field type picker dialog
- Support reordering via drag-and-drop

**Right panel — Properties sidebar (when a field is selected):**
- Label, placeholder, help text inputs
- Required toggle
- Width selector (full / half)
- **Visibility flags** (new):
  - "Show on Contestant Profile" toggle
  - "Show on Judge Score Card" toggle
- Options editor (for dropdown/radio/checkbox types)
- Validation rules (min/max length, min/max value)
- Conditional logic ("Show when [field] [operator] [value]")

**Field types supported:**
- Basic: Short Text, Long Text, Email, Phone, URL, Number, Date
- Choice: Dropdown, Radio, Checkbox
- Advanced: File Upload, Signature, Consent Checkbox
- Layout: Section Header

**Built-in fields (locked, non-deletable):**
- First Name, Last Name, Email (always required)
- Phone, Location, Age Category, Bio, Video URL
- Level/Category/SubEvent selectors
- Rules Acknowledged, Contestant Signature, Guardian fields

Built-in fields can be toggled on/off and have visibility flags set, but cannot be deleted or reordered out of their section.

### 2. Update `ContestantRegistration.tsx` to render new field types

The registration form currently renders custom fields as text/textarea/select. Update the `BioStep` (or create a dynamic `CustomFieldsStep`) to render all supported field types based on the enhanced config:
- Render fields respecting width, conditional logic, validation
- Support new types (radio, checkbox, date, number, consent, section header)

### 3. Add "Contestant Info" card to Judge Scoring page

In `JudgeScoring.tsx`, after the Raw Total card (line ~753), add a collapsible card:
- Title: "Contestant Info"
- Reads `custom_field_values` from the selected contestant's registration
- Only shows fields where `show_on_scorecard: true` in the form config
- Renders as a simple label/value list in an accordion
- Example: "Group Name: Team Alpha" for SPARK competitions

### 4. Show flagged fields on Contestant Profile

In `ContestantProfile.tsx`, in the details tab, add a section for custom registration data:
- Read the competition's `registration_form_config` to find fields with `show_on_profile: true`
- Display those custom field values from the registration record
- Render below the existing personal info section

### 5. Update `ScoreCard.tsx` (printed score card)

Add a small section between contestant info and scoring criteria that shows fields flagged as `show_on_scorecard: true`, so printed/exported score cards also include this data.

## Enhanced Field Config Shape

```typescript
interface FieldConfig {
  id: string;
  key?: string; // for built-in fields
  field_type: string;
  label: string;
  placeholder?: string;
  help_text?: string;
  enabled: boolean;
  required: boolean;
  sort_order: number;
  width: "full" | "half";
  options?: { label: string; value: string }[];
  validation?: { min_length?: number; max_length?: number; min?: number; max?: number };
  logic?: { show_when?: { field_id: string; operator: string; value: string } };
  show_on_profile: boolean;
  show_on_scorecard: boolean;
  is_builtin: boolean;
  section?: string; // grouping for built-in fields
}
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/competition/RegistrationFormsInline.tsx` | Full rewrite: drag-and-drop builder with properties panel, field picker, visibility flags |
| `src/pages/ContestantRegistration.tsx` | Update custom fields rendering to support new field types, validation, conditional logic |
| `src/pages/JudgeScoring.tsx` | Add collapsible "Contestant Info" card after Raw Total showing scorecard-flagged fields |
| `src/pages/ContestantProfile.tsx` | Add custom fields section for profile-flagged fields |
| `src/components/shared/ScoreCard.tsx` | Add scorecard-flagged custom fields to printed card |

