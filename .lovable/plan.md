

## Upload with AI Parsing

### Goal
Add an "Upload with AI" button alongside the existing "Bulk Upload" in the Registrations Manager. This creates a new dialog that uses AI (Lovable AI via edge function) to intelligently parse uploaded CSV/XLSX files — handling messy data like multi-line performer lists, fuzzy dance style matching, and non-standard column names.

### How it works

1. **User uploads a CSV/XLSX** (like the SPARK file) without needing a template
2. **AI parses the file** — the edge function receives the raw CSV rows + the competition's form schema (field names, dropdown options, hierarchy names) and returns structured registration data
3. **Preview & validate** — same pattern as bulk upload: show matched rows, flag issues
4. **Import** — insert approved rows into `contestant_registrations`

### Key parsing challenges the AI solves
- **Multi-line performers**: `"Asja Baptise\nKaela Marie Nicholas"` → stored as name list in custom fields
- **Dance style matching**: CSV has `"Modern (Contemporary)"` which needs to match the dropdown value like `"modern_contemporary"` or the label `"Modern (Contemporary)"`
- **Fuzzy column mapping**: `"Name of Applicant"` → `full_name`, `"Applicant's Email"` → `email`
- **Category/Level resolution**: `"Semifinal Round"` → level ID, `"Duet"` → category ID

### Files to create/update

1. **`supabase/functions/parse-registration-csv/index.ts`** (new edge function)
   - Receives: raw CSV text, form schema fields with options, competition hierarchy (levels, sub-events, categories)
   - Calls Lovable AI (Gemini Flash) with a structured output tool call
   - Returns: array of parsed registration objects with mapped field keys and resolved names

2. **`src/components/competition/AIUploadDialog.tsx`** (new component)
   - 3-step wizard: Upload → AI Preview → Import
   - Step 1: File upload (CSV/XLSX), shows loading spinner while AI processes
   - Step 2: Preview table showing AI-parsed rows with confidence indicators, ability to fix/exclude rows
   - Step 3: Confirm and import (reuses same insert logic as BulkUploadDialog)

3. **`src/components/competition/RegistrationsManager.tsx`** (update)
   - Add "Upload with AI" button next to "Bulk Upload"
   - Import and render `AIUploadDialog`

### Edge function design

The edge function will:
- Accept `{ csvText, formFields, hierarchy }` 
- Build a prompt telling the AI about available fields, their types, dropdown options, levels, categories, sub-events
- Use tool calling for structured output — each row maps to `{ full_name, email, phone, level, category, sub_event, custom_fields: {...} }`
- Handle the performers column by instructing AI to join multi-line names or store as comma-separated list
- Match dance style values against actual dropdown options provided in the schema

### UI placement
```text
[Add Registration] [Bulk Upload] [Upload with AI ✨]
```

### Technical details
- Uses `LOVABLE_API_KEY` (already configured) via Lovable AI gateway
- Model: `google/gemini-3-flash-preview` (fast, good at structured extraction)
- Batch processing: sends all rows in one request (CSV files typically < 500 rows)
- Falls back gracefully if AI can't parse a row (marks as "needs review")
- Reuses `useCompetitionHierarchy` hook from BulkUploadDialog for level/category/sub-event data
- Reuses same import logic (insert into `contestant_registrations` with `custom_field_values`)

