

## Code Sync Review — Findings

After reviewing the entire codebase for missing real-time subscriptions and inconsistent score formatting, here is what I found:

### 1. Missing Realtime: `audience_votes` table
The `audience_votes` table has **not** been added to `supabase_realtime` publication. The `useVoteCounts` hook relies on polling (`refetchInterval: 15_000`) and the `VoteAudit` component in the Tabulator Dashboard has no realtime at all — it only fetches once.

**Fix:** Add a migration to enable realtime for `audience_votes`, and add a realtime subscription in `VoteAudit` to auto-refetch when votes change.

### 2. Missing Realtime: `competition_updates` table
Not added to `supabase_realtime`. Currently fetches once via `useQuery` with no polling or subscription. Low priority since updates are infrequent, but worth noting.

### 3. Score Rounding Gap: `ScoreCard.tsx` (line 134)
The printable/exportable ScoreCard displays `final_score` without `.toFixed(2)`:
```tsx
{judgeScore?.final_score || (isBlank ? '___' : '')}
```
Should be `Number(judgeScore.final_score).toFixed(2)`.

### 4. Score Rounding Gap: `AnalyticsDashboard.tsx` (line 86)
Average score uses `.toFixed(1)` instead of `.toFixed(2)`:
```tsx
.toFixed(1)
```

### 5. All Other Score Displays — OK
`ScoreSummaryTable`, `SideBySideScores`, `PrintableScorecard`, `Results`, `ResultsHub`, `LevelMasterSheet`, `MasterScoreSheet`, `ContestantProfile`, `ContestantFeedback`, `PenaltyReview` — all correctly use `.toFixed(2)`.

### 6. All Other Realtime Subscriptions — OK
`judge_scores`, `tabulator_certifications`, `witness_certifications`, `chief_judge_certifications`, `performance_timer_events`, `performance_durations`, `event_messages`, `notifications`, `competitions`, `contestant_registrations`, `sub_event_assignments`, `event_tickets`, `activity_log` — all have realtime enabled and corresponding hooks.

---

### Proposed Changes

| File | Change |
|------|--------|
| New migration | `ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_votes` |
| `src/components/tabulator/VoteAudit.tsx` | Add realtime subscription to auto-refetch on vote changes |
| `src/hooks/useAudienceVoting.ts` | Add `useVoteCountsRealtime` hook (optional, since polling exists) |
| `src/components/shared/ScoreCard.tsx` | Format `final_score` with `.toFixed(2)` |
| `src/pages/AnalyticsDashboard.tsx` | Change `.toFixed(1)` → `.toFixed(2)` for avg score |

