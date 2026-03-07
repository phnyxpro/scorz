

## Bulk CSV Upload for Contestant Registrations

### Overview

Add a "Bulk Upload" button to `RegistrationsManager` that opens a multi-step dialog: (1) file upload + column mapping, (2) data preview with validation, (3) confirm and insert into database.

### Age Category Update

Update the `ageCategory` field throughout the system to support sub-categories:
- Current values: `adult`, `minor`
- New values: `adult`, `adult_18_24`, `adult_25_34`, `adult_35_44`, `adult_45_54`, `adult_55_plus`, `minor`
- Display labels: "Adult", "Adult | 18-24", "Adult | 25-34", "Adult | 35-44", "Adult | 45-54", "Adult | 55+", "Minor (Under 18)"
- Update the `PersonalStep` select in `ContestantRegistration.tsx` and the badge display in `RegistrationsManager`
- No DB migration needed — `age_category` is a text column with default `'adult'`

### New Component: `BulkUploadDialog`

**File: `src/components/competition/BulkUploadDialog.tsx`**

A 3-step dialog:

**Step 1 — File & Column Mapping**
- File input accepting `.csv` and `.xlsx`
- Parse using the `xlsx` library (already installed)
- Auto-detect column headers from the first row
- Present a mapping UI: for each registration field (Name, Email, Phone, Location, Age Category, Guardian/Consent, Time Slot), show a dropdown of CSV columns
- Auto-match by fuzzy header name (e.g., "Name" → Name, "Email" → Email, "WhatsApp" → Phone)
- A "Sub-event" selector — which sub-event these registrations belong to

**Step 2 — Preview & Validation**
- Display a scrollable table showing parsed rows mapped to registration fields
- Row-level validation: required fields (name, email), email format, duplicate detection (against existing registrations)
- Name splitting: auto-split the Name column into first/last name (split on first space)
- Age category mapping: map CSV values like "18 - 24" → `adult_18_24`, "Under 18" → `minor`, "25 - 34" → `adult_25_34`, etc.
- Guardian name parsing: for minor rows, extract guardian name from consent text between `[Parent&#x2F;Guardian's Full Name]` (or `[Parent/Guardian's Full Name]`) and the next comma
- Time slot parsing: parse strings like `"Sunday, Mar 08, 2026 9:00 AM-9:05 AM"` into `start_time` and `end_time` (HH:mm:ss format)
- Show error/warning badges per row; allow excluding invalid rows via checkbox
- Show total valid / invalid / duplicate counts

**Step 3 — Confirm & Import**
- Summary: "X contestants will be imported as approved"
- On confirm:
  - For each valid row, insert into `contestant_registrations` with `status: 'approved'`, `rules_acknowledged: true`, using the logged-in user's ID as `user_id` (on-behalf pattern)
  - If time slots are mapped, create `performance_slots` entries for each contestant
  - Set `sort_order` sequentially starting from the current max
- Show progress bar during import
- On complete, invalidate queries and close dialog

### Parsing Logic (within component)

```text
Age mapping:
  "18 - 24" | "18-24"       → "adult_18_24"
  "25 - 34" | "25-34"       → "adult_25_34"
  "35 - 44" | "35-44"       → "adult_35_44"
  "45 - 54" | "45-54"       → "adult_45_54"
  "55+"                     → "adult_55_plus"
  "Under 18" | "minor"      → "minor"
  anything else              → "adult"

Guardian extraction from consent text:
  Match /\[Parent.*Full Name\]\s*(.+?),/i → captured group is guardian name

Time slot parsing:
  Match /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
  Convert each to 24h HH:mm:ss
```

### Files Changed

| File | Changes |
|---|---|
| `src/components/competition/BulkUploadDialog.tsx` | New — 3-step upload dialog with parsing, mapping, preview, import |
| `src/components/competition/RegistrationsManager.tsx` | Add "Bulk Upload" button next to existing buttons, render dialog |
| `src/pages/ContestantRegistration.tsx` | Update age category `<select>` options to include sub-categories |

No database changes required — all fields already exist as text columns.

