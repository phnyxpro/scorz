

## Plan: Dynamic Category Selectors + Performers Repeater Fix

### Problems identified

1. **Category/Sub-Category selectors render as plain text inputs** — The Format C conversion in `useRegistrationForm.ts` doesn't map `category_selector` and `subcategory_selector` field types, so they fall through to `"text"`. Additionally, the `fieldTypeMap` is missing entries for `repeater`, `consent`, `rating`, `toggle`, `divider`, `hidden`, `rich_text`.

2. **Repeater children not assembled into `repeaterFields`** — Format C conversion maps all fields flat into sections. Fields with `parent_repeater_id` are not grouped as `repeaterFields` on their parent repeater `FormField`, so they show as independent text fields.

3. **Category selector uses Select dropdowns, not buttons** — The `CategoryLevelPicker` currently renders a `<Select>` dropdown. The user wants button-style selection (clickable option buttons).

4. **Performers field is a `long_text` instead of a repeater** — The SPARK template uses "Student Names (one per line)" as a textarea. The user wants a sub-repeater for adding performer names individually. Since nested repeaters aren't supported in the current model, I'll implement a special "name_list" rendering mode: an array of text inputs with Add/Remove buttons, stored as an array value.

### Files to change

| File | Change |
|------|--------|
| `src/hooks/useRegistrationForm.ts` | In Format C conversion: (a) add missing field types to `fieldTypeMap` including `repeater`, `category_selector`, `subcategory_selector`, `consent`, etc. (b) After mapping fields, group children with `parent_repeater_id` into their parent's `repeaterFields` array and remove them from the flat list. Map `showWhen` logic from `logic.show_when` format to the `showWhen` format used by FormField. |
| `src/components/registration/DynamicRegistrationForm.tsx` | (a) Change `CategoryLevelPicker` to render selectable buttons instead of `<Select>` dropdowns. (b) In `RepeaterField`, add support for `category_selector` and `subcategory_selector` sub-field types that pull dynamic data. (c) Add a "name_list" sub-field type rendered as an array of text inputs with Add/Remove. |
| `src/lib/form-builder-types.ts` | Update SPARK template: replace `spark_entry_student_names` (long_text) with a `repeater` type or a new `name_list` field type for group performer names. Replace `spark_entry_category`/`spark_entry_sub_category` `dropdown` types with `category_selector`/`subcategory_selector`. |

### Technical details

- The `fieldTypeMap` will be extended: `{ repeater: "repeater", category_selector: "category_selector", subcategory_selector: "subcategory_selector", consent: "checkbox", rating: "rating", toggle: "toggle", divider: "divider", hidden: "hidden", rich_text: "rich_text" }`
- After mapping all fields in Format C, a post-processing step groups fields by `parent_repeater_id`, attaching them as `repeaterFields` on the repeater FormField and converting `logic.show_when` to `showWhen: { fieldKey, equals }`
- `CategoryLevelPicker` will render a flex-wrap grid of buttons with selected state styling instead of a Select dropdown
- For the performers list, a new approach: change the SPARK template fields for student names (solo, duet, group) to use a simple "name_list" field type — rendered as dynamic text inputs with Add/Remove buttons, stored as a string array

