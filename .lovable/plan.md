

## Plan: Add Mobile Dropdown Pattern to Pages with Tab Overflow

Apply the same mobile dropdown pattern (already implemented on CompetitionDetail) to pages where tabs can overflow or feel cramped on mobile.

### Pages to Update

1. **`src/pages/ContestantProfile.tsx`** — up to 5 tabs (Details, Media, History, Scores, Votes) in a grid that gets very tight on mobile
2. **`src/pages/ChiefJudgeDashboard.tsx`** — 4 tabs (Panel Monitor, Penalty Review, Infractions, Tie Breaking) with long labels
3. **`src/pages/Settings.tsx`** — 4 tabs in grid-cols-4, labels truncate on small screens
4. **`src/pages/JudgingHub.tsx`** — dynamic level tabs that wrap; can overflow when many levels exist

### Pattern (same as CompetitionDetail)
For each page:
1. Import `useIsMobile` and `Select` components
2. Convert `Tabs` from `defaultValue` to controlled (`value`/`onValueChange`)
3. On mobile: render a `Select` dropdown with all tab options
4. On desktop: keep the existing `TabsList` unchanged

### Pages NOT Changed
- `SignaturePad.tsx` — only 2 tabs (Draw/Type), fits fine
- `RegistrationsManager.tsx` — sub-event tabs are short, already compact
- `ScoreSheetPreviewModal.tsx` — inside a dialog, limited tabs

