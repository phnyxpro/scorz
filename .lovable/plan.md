

## Plan: Enhanced Form Builder with New Field Types + SPARK Schools Configuration

### What changes

**1. Add new field types to the form builder**

Add these missing field types to `FIELD_TYPES` array in `RegistrationFormEditor.tsx` and to the `FieldType` union in `useRegistrationForm.ts`:
- `time` — Time input
- `color` — Color picker
- `currency` — Currency/money input
- `rating` — Star/numeric rating
- `toggle` — Yes/No toggle switch
- `hidden` — Hidden field (stores value without display)
- `divider` — Visual separator line (layout)
- `signature` — Signature pad (already exists as builtin, make available as custom too)
- `consent` — Consent checkbox with label text
- `rich_text` — Rich text / formatted long text

Also add `category_selector` and `subcategory_selector` to the BUILTIN_FIELDS list so organisers can add category drill-down selectors.

**2. Remove badges from field type buttons in Add Field dialog**

In `RegistrationFormEditor.tsx`:
- Remove the `<Badge>` showing field type next to built-in field buttons (line 353)
- Remove the `<Badge>` showing "built-in" or type in the FieldEditor row (lines 427-429) — replace with a subtle text indicator or remove entirely

**3. Add more sub-field types to the Repeater editor**

In the `RepeaterFieldEditor` component, expand the allowed sub-field types dropdown to include: `text`, `email`, `number`, `url`, `select`, `textarea`, `phone`, `date`, `checkbox`, `radio`, `file`. Also allow sub-fields to have their own options (for select/radio sub-fields).

**4. Add conditional logic support for repeater sub-fields**

Allow repeater sub-fields to have `showWhen` targeting other sub-fields within the same repeater row (e.g., show "Student Name 2" when entry type = "duet"). This uses the existing `showWhen` mechanism scoped to the repeater row context.

**5. Wire up rendering of new field types in DynamicRegistrationForm**

Add rendering cases for `time`, `color`, `currency`, `rating`, `toggle`, `hidden`, `divider`, `consent`, `rich_text` in the `DynamicRegistrationForm` field renderer.

### Files modified

| File | Change |
|------|--------|
| `src/hooks/useRegistrationForm.ts` | Add new field types to `FieldType` union |
| `src/components/competition/RegistrationFormEditor.tsx` | Add new FIELD_TYPES entries, remove badges, expand repeater sub-field types, add category/subcategory to BUILTIN_FIELDS |
| `src/components/registration/DynamicRegistrationForm.tsx` | Add rendering for new field types |

### Technical details

- New `FieldType` values added: `"time" | "color" | "currency" | "rating" | "toggle" | "hidden" | "divider" | "consent" | "rich_text"`
- The `consent` type renders as a checkbox with a configurable label (using `description` field)
- The `divider` type renders as an `<hr>` separator, non-data
- The `rating` type renders as a 1-5 number input or star selector
- The `toggle` type renders as a Switch component
- All new types are purely client-side form schema additions — no DB migration needed since custom field values are stored in the `custom_field_values` JSON column
- After this is implemented, the SPARK Secondary Schools form can be configured in the form builder with: School Info section → Applicant Info section → Entries repeater (with category_selector sub-field + performance detail sub-fields + conditional student name fields)

