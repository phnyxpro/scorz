

## Recommendations and Optimisations

After a thorough review of the codebase, here are actionable improvements grouped by priority.

---

### 1. Performance: Remove 1-second polling on timer events

**File:** `src/hooks/usePerformanceTimer.ts` (line 28)

`useLatestTimerEvent` polls every 1 second (`refetchInterval: 1000`), making a database query every second per active judge/view. A realtime subscription (`useTimerEventsRealtime`) already exists in the same file. The polling should be removed and replaced with the existing realtime hook, or increased to 5-10 seconds as a fallback. This is the single biggest performance win.

---

### 2. Performance: Remove polling on audience votes (now that realtime is enabled)

**File:** `src/hooks/useAudienceVoting.ts` (line 20)

`useVoteCounts` still polls every 15 seconds (`refetchInterval: 15_000`). Since we just added `audience_votes` to `supabase_realtime` and `VoteAudit` already has a realtime subscription, the polling can be removed. Instead, add a realtime subscription in the `useVoteCounts` hook to invalidate the query key on changes.

---

### 3. Score formatting: Remaining `.toFixed(1)` inconsistencies

Several places still use `.toFixed(1)` for scores instead of `.toFixed(2)`:

| File | Line | Field | Current |
|------|------|-------|---------|
| `ScoreSummaryTable.tsx` | 151 | `avgPenalty` | `.toFixed(1)` |
| `SideBySideScores.tsx` | 72 | `raw_total` | `.toFixed(1)` |
| `SideBySideScores.tsx` | 111 | avg `time_penalty` | `.toFixed(1)` |
| `PrintableScorecard.tsx` | 149 | `raw_total` | `.toFixed(1)` |
| `ContestantProfile.tsx` | 176 | `avgScore` | `.toFixed(1)` |
| `TieBreaker.tsx` | 62 | tie score | `.toFixed(1)` |
| `JudgeScoring.tsx` | 512, 588 | `rawTotal` | `.toFixed(1)` |

These should all be updated to `.toFixed(2)` for consistency with the final score columns.

---

### 4. Optimisation: TabulatorDashboard overview query fetches all scores

**File:** `src/pages/TabulatorDashboard.tsx` (lines 54-105)

`useJudgingOverview` fetches ALL scores for ALL sub-events in a competition in a single query (line 90). For large competitions this could hit the 1000-row Supabase limit and cause missing data. 

**Fix:** Either add `.limit(5000)` or paginate, or better yet, only fetch scores for the currently active sub-event (since `SubEventWorkspace` already fetches its own scores via `useAllScoresForSubEvent`). The overview scores are only used for the contestant accordion inline display — consider lazy-loading them per sub-event.

---

### 5. Optimisation: Memoize `contestantName` lookup functions

**File:** `src/pages/TabulatorDashboard.tsx` (lines 170-173)

`contestantName` and `contestantUserId` are plain functions using `Array.find()`, called on every render for every contestant. They should be wrapped in `useMemo` returning a `Map` for O(1) lookups:

```tsx
const contestantMap = useMemo(() => {
  const m = new Map();
  registrations.forEach(r => m.set(r.id, r));
  return m;
}, [registrations]);
const contestantName = (regId: string) => contestantMap.get(regId)?.full_name ?? "Unknown";
```

---

### 6. Minor: Missing React key warning

**File:** `src/pages/TabulatorDashboard.tsx` (line 695)

The `<>` fragment wrapping contestant rows and their expanded score rows uses `key` on the `TableRow` but not on the fragment. This causes React key warnings. Use `<Fragment key={c.id}>` instead.

---

### Summary of changes

| File | Change |
|------|--------|
| `src/hooks/usePerformanceTimer.ts` | Remove 1s polling, rely on realtime |
| `src/hooks/useAudienceVoting.ts` | Remove 15s polling, add realtime subscription |
| `src/components/tabulator/ScoreSummaryTable.tsx` | `avgPenalty.toFixed(2)` |
| `src/components/tabulator/SideBySideScores.tsx` | `raw_total.toFixed(2)`, penalty `.toFixed(2)` |
| `src/components/results/PrintableScorecard.tsx` | `raw_total.toFixed(2)` |
| `src/pages/ContestantProfile.tsx` | `avgScore.toFixed(2)` |
| `src/components/chief-judge/TieBreaker.tsx` | tie score `.toFixed(2)` |
| `src/pages/JudgeScoring.tsx` | `rawTotal.toFixed(2)` |
| `src/pages/TabulatorDashboard.tsx` | Memoize contestant lookups, fix Fragment key, limit overview scores query |

