

## Show All Scores in Real-Time (Not Just Certified)

### Problem
Both `ScoreSummaryTable` and `SideBySideScores` currently filter to only `certifiedScores` for criterion averages and final score calculations. This means the tabulator sees dashes and zeros until judges certify — they can't monitor scoring as it happens.

### Changes

**`src/components/tabulator/ScoreSummaryTable.tsx`**
- Use **all scores** (not just `certifiedScores`) for criterion averages and final score computation
- Keep the certified/pending badge counts as-is for status visibility
- Change the computation logic on lines 21-47: use `scores` instead of `certifiedScores` for `criterionAvgs`, `rawTotals`, `avgPenalty`, and `avgFinal`

**`src/components/tabulator/SideBySideScores.tsx`**
- In the Average row (lines 77-103), use **all scores** instead of `scores.filter(s => s.is_certified)` for computing criterion averages, raw total average, penalty average, and final average

Both components already receive real-time data via `useJudgeScoresRealtime` in `TabulatorDashboard` — so scores will update live as judges input them.

### Files changed
- `src/components/tabulator/ScoreSummaryTable.tsx` — use all scores for calculations
- `src/components/tabulator/SideBySideScores.tsx` — use all scores in average row

