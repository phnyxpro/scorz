

## Comprehensive Scoring & Chief Judge Dashboard Overhaul

This is a large, multi-faceted change touching the Olympic scoring formula, the Penalty Review component, the Chief Judge Dashboard tabs, the Master Score Sheet advancement highlighting, and navigation buttons. Here is the plan organized by area.

---

### 1. Fix Olympic Scoring Formula (`src/lib/scoring-methods.ts`)

The current `calculateOlympic` averages the trimmed scores. The correct NPS formula is:

1. Sum all judges' raw totals
2. Subtract (MAX + MIN) from that sum
3. Subtract penalty (time + general infractions) from that trimmed sum
4. Average = trimmed-and-penalized sum / (n - 2)

**Changes:**
- Update `calculateOlympic` to: `trimmedSum = total - max - min`, then `final = (trimmedSum - penalty) / (n - 2)`
- Update the formula description string to match

### 2. Fix Master Score Sheet calculation (`src/pages/MasterScoreSheet.tsx`)

Currently the sheet passes `rawTotals` (per-judge) and an averaged penalty to `calculateMethodScore`. This must change:
- Pass array of `raw_total` values from all judges
- Compute total time penalty once (use the average `performance_duration_seconds` to look up penalty, OR sum time_penalty from one representative score — since the penalty is per-contestant, not per-judge)
- Add general infractions penalty from `chief_judge_certifications.penalty_adjustments`
- The columns should show: each judge's raw_total, the 5-Judge Sum, Trimmed Sum (minus high/low), Penalty, Final Score
- Fetch `competition_levels` data including `advancement_count` to know how many advance
- Highlight advancing rows in green (top N by rank where N = level's `advancement_count`)

### 3. Overhaul Penalty Review (`src/components/chief-judge/PenaltyReview.tsx`)

The current component shows per-judge-score rows. It should instead show **per-contestant** rows:
- Group scores by `contestant_registration_id`
- Filter to contestants who have any time penalty > 0 or performance_duration_seconds > 0
- Columns: Contestant | Duration (avg across tabulators) | All Judges Raw Total (sum of all judges' raw_totals) | Penalty (single time penalty value) | Final Score (after Olympic calculation)
- Chief Judge can adjust the penalty value per contestant (not per judge score)
- The `onAdjust` callback needs reworking — it should update all judge_scores for that contestant with the new penalty, OR store the override in `penalty_adjustments` on the certification record

### 4. Add "Scores" tab to Chief Judge Dashboard (`src/pages/ChiefJudgeDashboard.tsx`)

Insert a new tab "Scores" between "Panel Monitor" and "Penalty Review":
- Embed the ContestantScoresOverview component inline (not as a page navigation)
- Reuse the accordion table, pagination, and real-time score updates from `ContestantScoresOverview`
- Extract the inner content into a reusable component or import and render inline with the current sub-event context

Tab order: Panel Monitor → Scores → Penalty Review → Infractions → Tie Breaking

### 5. Add Penalties button to Chief Judge Dashboard

In the summary card's button row (between Rules and Rubric), add a "Penalties" button linking to `/competitions/${competitionId}/penalties`.

### 6. Level Master Sheet advancement highlighting (`src/pages/LevelMasterSheet.tsx`)

- Fetch the level's `advancement_count` from `competition_levels`
- Highlight the top N rows (by rank) with a green background (`bg-emerald-50 dark:bg-emerald-950/20`)
- Show a small "Advances" badge on those rows
- Also apply the corrected Olympic scoring formula here

### 7. Fix Level Master Sheet scoring calculation

Same formula fix as Master Score Sheet — use raw_totals, apply penalty once, trim high/low, then average.

---

### Summary of files to modify:
- `src/lib/scoring-methods.ts` — Fix Olympic formula
- `src/components/chief-judge/PenaltyReview.tsx` — Rewrite to per-contestant aggregation
- `src/pages/ChiefJudgeDashboard.tsx` — Add Scores tab, add Penalties button
- `src/pages/MasterScoreSheet.tsx` — Fix calculation, add advancement highlighting, fetch level data
- `src/pages/LevelMasterSheet.tsx` — Fix calculation, add advancement highlighting

### No database changes needed.

