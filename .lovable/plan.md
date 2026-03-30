

## Plan: Dynamic Bulk Upload Wizard with Per-Competition CSV Template

### Summary
Replace the current hardcoded bulk upload with a competition-aware wizard that reads the registration form config (`registration_form_config`) to dynamically generate column mappings and CSV templates. Each competition gets a downloadable CSV template matching its specific form fields.

### Steps

1. **Rewrite `BulkUploadDialog.tsx` as a 4-step wizard**
   - **Step 0 (new): Download Template** — Generate and offer a CSV template based on the competition's `registration_form_config`. Template columns come from the form schema: builtin fields map to known column names (Full Name, Email, Phone, Location, Age Category, Guardian Name, Level, Sub-Event, Category, etc.), custom fields use their label. A "Download CSV Template" button triggers a client-side CSV download.
   - **Step 1: Upload & Map Columns** — User uploads CSV/XLSX. Auto-map columns by fuzzy-matching against the dynamic field list (not the old hardcoded 7 fields). Show mapping dropdowns for each form field. Include level and sub-event selectors that pull from the competition's actual levels/sub-events hierarchy.
   - **Step 2: Preview & Validate** — Parse rows using the dynamic mapping. Validate required fields from the form config. Show errors, warnings, duplicates. Allow row toggling.
   - **Step 3: Import** — Insert registrations with both builtin column values and `custom_field_values` JSON for custom fields. Create performance slots if time data exists.

2. **Add CSV template generation utility**
   - New helper function `generateCsvTemplate(formSchema, levels, subEvents, categories)` in the component or a shared util.
   - Iterates form sections/fields, skips non-data fields (signatures, rules acknowledgment, headings).
   - Produces header row with field labels.
   - Includes 1-2 example rows showing expected format (e.g., "adult" or "minor" for age category, level/sub-event names).

3. **Dynamic field mapping from form config**
   - Use `useRegistrationFormConfig(competitionId)` to get the form schema.
   - Build the `FIELD_OPTIONS` list dynamically from the schema instead of the hardcoded 7 fields.
   - For builtin fields, map CSV values to DB columns directly.
   - For custom fields, collect values into the `custom_field_values` JSON object on insert.
   - For level/sub-event/category selectors, resolve names to IDs by matching against fetched levels/sub-events/categories.

4. **Wire up in RegistrationsManager**
   - The existing `BulkUploadDialog` is already wired in. No routing changes needed.
   - Pass the form config data to the dialog or let it fetch internally (it already has `competitionId`).

### Technical Details

- **Template generation**: Pure client-side. Build CSV string from form schema fields, create a Blob, trigger download via `URL.createObjectURL`.
- **Name resolution**: When CSV contains level/sub-event/category names (strings), resolve them to UUIDs by matching against `competition_levels`, `sub_events`, and `competition_categories` tables.
- **Custom field storage**: Non-builtin fields get stored in `custom_field_values` JSON column: `{ "field_key": "value", ... }`.
- **Fallback**: If no form config exists, fall back to `createDefaultFormSchema()` to generate the template and mapping.

### Files Modified
- `src/components/competition/BulkUploadDialog.tsx` — Major rewrite with dynamic fields, template download, name-to-ID resolution
- No new files, no DB changes needed

