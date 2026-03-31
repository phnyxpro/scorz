

## Plan: Configure SPARK Secondary Schools Registration Form

### Approach

Write the SPARK form config directly to the competition's `registration_form_config` column using an edge function call or a one-time script. Since the form builder uses the `FormBuilderConfig` format (`{ sections, fields, version }`), I'll craft the exact JSON config and update it via a Supabase query in the save handler pattern already used by the form builder.

The most practical approach: **add a "Load Template" feature** to `RegistrationFormsInline.tsx` that lets organisers pick a preset (starting with "SPARK Secondary Schools"), which populates the form builder with the correct sections and fields. This way the config is reusable and the organiser can still customize it.

### Template: SPARK Secondary Schools

**Sections:**
1. **School Information** — Name of School (short_text), School Phone Number (phone)
2. **Applicant Information** — Name of Applicant (short_text), Applicant Email (email), Applicant Phone (phone)
3. **Competition Entries** — A single **repeater** field ("Add Entry") with sub-fields:
   - Category (dropdown — Solo, Duet, Group, Student Choreography)
   - Sub-Category (dropdown)
   - Division (dropdown)
   - Performance Video URL (url)
   - Choreographer Name (short_text)
   - Dance Style (short_text)
   - Synopsis (long_text)
   - Number of Dancers (number)
   - Student Name (short_text) — shown when category = Solo
   - Student Name 1 (short_text) — shown when category = Duet
   - Student Name 2 (short_text) — shown when category = Duet
   - Group Name (short_text) — shown when category = Group or Student Choreography
   - Group Members (repeater-like, but since nested repeaters aren't supported, use a long_text "Student Names — one per line") — shown when category = Group or Student Choreography
4. **Legal & Consent** — Rules Acknowledgment (consent), Signature (signature)

### Files to change

| File | Change |
|------|--------|
| `src/components/competition/RegistrationFormsInline.tsx` | Add a "Load Template" button + dialog with SPARK preset; when selected, replace current config with the predefined `FormBuilderConfig` |
| `src/lib/form-builder-types.ts` | Add `SPARK_TEMPLATE` constant with the full `FormBuilderConfig` JSON, and a `FORM_TEMPLATES` array for future presets |

### Technical details

- The template is a static `FormBuilderConfig` object with pre-generated UUIDs (using `crypto.randomUUID()` at load time)
- The "Load Template" button appears next to the Save button; clicking it opens a dialog with available templates
- Selecting a template replaces the entire form config and marks the form as dirty so the organiser must click Save to persist
- The repeater field's sub-fields use `showWhen` with `fieldKey` targeting the category dropdown within the same repeater row
- For Group/Student Choreography student names: use a `long_text` sub-field labeled "Student Names (one per line)" since nested repeaters aren't supported
- No database migration needed — this writes to the existing `registration_form_config` JSON column

