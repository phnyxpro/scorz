

## Plan: Document Upload with Content Display for Rules & Rubric

### Problem
The user wants uploaded documents (rules PDF, rubric document) to have their content extracted and displayed inline on the platform, rather than just providing a download link.

### Current State
- No `DocumentUpload` component exists yet (was planned but not implemented).
- No `documents` storage bucket exists.
- The `competitions` table lacks `rules_document_url` and `rubric_document_url` columns.
- Build errors exist in `NotificationCenter.tsx` (unrelated, will fix).

### Approach

**1. Database Migration**
- Add `rules_document_url` and `rubric_document_url` columns to `competitions`.
- Create a `documents` storage bucket (public read) with RLS policies for authenticated admin/organizer uploads.

**2. New `DocumentUpload` Component** (`src/components/shared/DocumentUpload.tsx`)
- Reusable file upload component accepting PDF, DOCX, DOC files (max 10MB).
- Uploads to the `documents` bucket.
- Shows the current file name with download and remove actions.
- Mirrors the `BannerUpload` pattern.

**3. PDF Content Rendering**
- For PDF files: embed an inline `<iframe>` viewer so content is displayed directly on the page.
- For non-PDF files: provide a download card with file type icon.
- This means when a rules or rubric document is uploaded, the public page will render the PDF inline (the browser's native PDF viewer) rather than requiring a separate download.

**4. Update `CompetitionDetail.tsx` General Tab**
- Add two `DocumentUpload` fields: one for rules document, one for rubric document.
- Keep the existing rules URL text input as an alternative.
- Wire `onUploaded`/`onRemoved` callbacks to save URLs to the new columns.

**5. Update `RulesAndRubric.tsx` Public Page**
- If `rules_document_url` exists, render an embedded PDF viewer (iframe) for PDFs or a download card for other formats.
- If `rubric_document_url` exists, render it similarly in the rubric section.
- Fall back to existing behavior (external URL link, criteria grid) when no documents are uploaded.

**6. Fix `NotificationCenter.tsx` Build Errors**
- The `notifications` table doesn't exist in the generated types. The existing `as any` casts should work, but the error suggests the Supabase client generic is rejecting `"notifications"`. Will ensure all `.from("notifications")` calls use proper type assertions to suppress TS errors.

### Files Changed
- **Migration**: Add columns + storage bucket + RLS policies
- **New**: `src/components/shared/DocumentUpload.tsx`
- **Modified**: `src/pages/CompetitionDetail.tsx` — add document upload sections
- **Modified**: `src/pages/RulesAndRubric.tsx` — render uploaded documents inline
- **Modified**: `src/components/notifications/NotificationCenter.tsx` — fix build errors

