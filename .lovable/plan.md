

## Scoring Method Configuration

### What We're Building

A competition-level scoring method selector in the Scoring tab, allowing organizers to choose how final scores are calculated. The selected method drives all downstream score aggregation (Master Score Sheet, Tabulator, Results, etc.).

### Scoring Methods to Support

1. **Olympic (High-Low Trim)** — Default. Drop highest and lowest judge scores, average the rest, subtract time penalty.
2. **Cumulative (Total Sum)** — Sum all judge scores, subtract penalty.
3. **Weighted Category** — Rubric criteria have configurable weight percentages; weighted sum across judges, minus penalty.
4. **Rank-Based (Borda Count)** — Judges rank contestants; points assigned by rank position.
5. **Audience Choice (Decibel)** — Winner determined by audience vote count (already partially exists via `audience_votes`).
6. **Head-to-Head (Bracket)** — Binary win/lose per round; no numeric scores.

### Database Changes

**Migration: Add `scoring_method` column to `competitions` table**

```sql
ALTER TABLE public.competitions
  ADD COLUMN scoring_method text NOT NULL DEFAULT 'olympic';
```

No new tables needed. The method is stored per competition and read by all scoring/results pages.

### UI Changes

**1. `ScoringSettingsManager.tsx` — Add Scoring Method Card**

Add a new card at the top of the component (above the per-sub-event toggle cards) with:
- A `Select` dropdown for choosing the scoring method
- A description panel that dynamically shows an explanation + formula for the selected method
- For "Weighted Category": show an inline note that weights are configured per rubric criterion (future enhancement or link to Rubric tab)
- Save the selection to `competitions.scoring_method` via direct Supabase update

Methods in the dropdown:
| Value | Label |
|---|---|
| `olympic` | Olympic (High-Low Trim) |
| `cumulative` | Cumulative (Total Sum) |
| `weighted` | Weighted Category |
| `rank` | Rank-Based (Borda Count) |
| `audience` | Audience Choice |
| `head_to_head` | Head-to-Head (Bracket) |

Each option shows a brief description below the selector explaining the formula.

**2. Score Calculation Utility — `src/lib/scoring-methods.ts`**

Create a pure utility module with functions for each method:

```typescript
export function calculateOlympic(scores: number[], penalty: number): number
export function calculateCumulative(scores: number[], penalty: number): number
export function calculateMethodScore(method: string, scores: number[], penalty: number, options?: { weights?: number[] }): number
```

The Olympic method: sort scores, remove min and max, average remainder, subtract penalty.

**3. Update Score Aggregation Pages**

Modify the three places that currently calculate averages to use the scoring method:

- **`MasterScoreSheet.tsx`** (lines 107-133): Instead of simple average, call `calculateMethodScore` with the competition's `scoring_method`.
- **`ScoreSummaryTable.tsx`** (lines 16-59): Same — use method-aware calculation.
- **`Results.tsx` / `LevelMasterSheet.tsx`**: Any other pages doing score aggregation.

Each of these will need the competition's `scoring_method` passed as a prop or fetched.

**4. `useCompetitions.ts` — Extend `Competition` interface**

Add `scoring_method?: string` to the `Competition` interface so it flows through existing hooks.

### Implementation Order

1. Run migration to add `scoring_method` column
2. Update `Competition` interface in `useCompetitions.ts`
3. Create `src/lib/scoring-methods.ts` utility
4. Update `ScoringSettingsManager.tsx` with method selector UI
5. Update `MasterScoreSheet.tsx` and `ScoreSummaryTable.tsx` to use method-aware calculations
6. Pass `scoring_method` through to any other aggregation pages

### What This Does NOT Change

- Individual judge scoring (each judge still scores per-criterion and gets a `raw_total` / `final_score` per contestant)
- The penalty system (penalties remain per-judge-score via the existing `penalty_rules` + `time_penalty` columns)
- The scoring method only affects how multiple judges' scores are **aggregated** into a contestant's final ranking

