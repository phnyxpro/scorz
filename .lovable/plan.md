

## Plan: Reorganize Competition Settings Tabs

### Changes

**1. Rename tab: "Levels & Events" → "Schedule"** in `CompetitionDetail.tsx`

**2. Move Rules content into a new "Rules" tab** in `CompetitionDetail.tsx`
- Add a new `TabsTrigger` for "Rules" and a `TabsContent` containing:
  - Competition Rules URL input
  - Rules Document Upload (`DocumentUpload` component)
  - Own Save button for these fields
- Remove these three elements from the General tab

**3. Move Rubric Document Upload into the "Rubric" tab**
- Add the `DocumentUpload` for rubric document above the `RubricBuilder` in the Rubric tab content
- Remove it from the General tab
- Wrap both in a `space-y-4` container with a Card for the upload

### Files Changed

| File | Change |
|------|--------|
| `src/pages/CompetitionDetail.tsx` | Rename tab label; create "Rules" tab with URL input + doc upload + save button; move rubric doc upload into Rubric tab; remove both from General tab |

No new files, no database changes.

