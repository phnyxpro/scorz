

## Problem

The `--primary` color is set to `var(--brand-charcoal)` (dark gray) in both light and dark modes. When used as a hover color (`hover:text-primary`, `group-hover:text-primary`), it blends into the dark background in dark mode, creating poor contrast — as visible in the uploaded screenshot where card titles on hover become nearly invisible.

## Solution

Replace all `hover:text-primary` and `group-hover:text-primary` instances on text/links with `hover:text-accent` (orange) or `hover:text-secondary` (green), following the existing color-coding convention:

- **Public-facing / event cards / general links**: use `hover:text-accent` (orange) — matches the brand accent already used for the "Z" in SCORZ and action CTAs
- **Competition operations links** (contestant profiles, score sheets, results): use `hover:text-secondary` (green) — aligns with the dashboard color-coding for competition/operations items

### Files to update (~18 files, ~105 occurrences)

| Context | Hover color | Files |
|---|---|---|
| Public event cards, audience pages | `text-accent` | `PublicEvents.tsx`, `AudienceEvents.tsx`, `PublicEventDetail.tsx` |
| Dashboard cards | `text-accent` | `Dashboard.tsx` |
| Contestant profile links | `text-secondary` | `CompetitionContestants.tsx`, `ContestantProfilesHub.tsx` |
| Score/results links | `text-secondary` | `Results.tsx`, `ResultsHub.tsx`, `MasterScoreSheet.tsx`, `LevelMasterSheet.tsx` |
| Tabulator/chief-judge links | `text-secondary` | `SideBySideScores.tsx`, `ScoreSummaryTable.tsx`, `PanelMonitor.tsx`, `PenaltyReview.tsx` |
| Upload/document hover | `text-accent` | `DocumentUpload.tsx` |
| Misc (NotFound, etc.) | `text-accent` | `NotFound.tsx` |

### Implementation

A global find-and-replace of `hover:text-primary` → `hover:text-accent` and `group-hover:text-primary` → `group-hover:text-accent` as the default, then selectively switch competition/operations links to `hover:text-secondary` / `group-hover:text-secondary` per the table above. Border hovers like `hover:border-primary/50` will also be updated to match (`hover:border-accent/50`).

No CSS variable changes needed — this is purely a Tailwind class swap.

