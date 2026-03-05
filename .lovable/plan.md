

## Plan: PDF Content Extraction for Rules & Rubric

### Problem
Currently, uploaded PDFs are displayed via iframe or download links. The user wants the PDF content to be **extracted as text** when uploaded, so it can be rendered natively in the UI (and for rubric PDFs, potentially populate the rubric criteria).

### Approach

**1. Create an Edge Function `parse-pdf`**
- Accepts a PDF URL (from the documents storage bucket)
- Fetches the PDF and extracts text content using a lightweight PDF parsing approach
- Returns structured text content
- For rubric documents: attempts to identify criteria names and scoring descriptions
- For rules documents: returns the full extracted text

**2. Add `rules_content` and `rubric_content` columns to `competitions` table**
- New text columns to store the extracted content from PDFs
- Migration: `ALTER TABLE competitions ADD COLUMN rules_content text, ADD COLUMN rubric_content text;`

**3. Update `DocumentUpload` component or create a wrapper**
- After successful PDF upload + save, trigger the edge function to parse the PDF
- Store the extracted text back to the competition record
- Show a loading/scanning indicator during extraction

**4. Update the CompetitionDetail settings page**
- After PDF upload, call the parse edge function
- Save extracted content to the new columns
- For rubric PDFs: offer to auto-populate rubric criteria from parsed content (with user confirmation)
- For rules PDFs: save as `rules_content` text

**5. Update public-facing pages (RulesPage, RubricPage, RulesAndRubric)**
- Display `rules_content` as formatted text in a Card (replacing or supplementing the iframe)
- Display `rubric_content` similarly, falling back to the `rubric_criteria` table data

### Technical Details

**Edge Function** (`supabase/functions/parse-pdf/index.ts`):
- Uses the Lovable AI (Gemini Flash) to extract and structure PDF content via the document URL
- Accepts `{ url: string, type: "rules" | "rubric" }` 
- For rubric type: returns structured JSON with criteria names and level descriptions
- For rules type: returns plain text content

**AI-Powered Extraction** (using Lovable AI supported models):
- Send the PDF URL to Gemini with a prompt to extract either rules text or rubric criteria
- For rubric: parse into structured format matching the `rubric_criteria` schema (name, description_1-5)
- This avoids needing a separate PDF parsing library

**UI Flow**:
1. Admin uploads PDF → file saved to storage
2. "Scan Document" button appears (or auto-triggers)
3. Edge function calls AI to extract content
4. For rules: extracted text saved to `rules_content` column, displayed in UI
5. For rubric: extracted criteria offered as auto-fill for RubricBuilder, user confirms before saving
6. Public pages show the extracted text natively instead of/alongside the iframe

**Files to create/modify**:
- `supabase/functions/parse-pdf/index.ts` (new)
- Migration for `rules_content` and `rubric_content` columns
- `src/components/shared/DocumentUpload.tsx` — add optional `onScanComplete` callback
- `src/pages/CompetitionDetail.tsx` — wire up scanning after upload
- `src/components/competition/RubricBuilder.tsx` — accept scanned criteria as prefill
- `src/pages/RulesPage.tsx`, `src/pages/RubricPage.tsx`, `src/pages/RulesAndRubric.tsx` — render extracted text

