

## Plan: Extract Score Tables to Dedicated Page + Remove Auto-Save from Judge Scoring

### 1. New page: `src/pages/ScoreTablesPage.tsx`

Extract **only** the three tabs (Score Summary, Side-by-Side Detail, Vote Audit) from `SubEventWorkspace` into a standalone page.

- Route: `/competitions/:id/score-tables?sub_event=<subEventId>`
- The page will fetch its own data using the same hooks (`useAllScoresForSubEvent`, `useJudgeScoresRealtime`, `usePerformanceDurations`, `useDurationsRealtime`, `useStaffDisplayNames`)
- Accept `competitionId` and `subEventId` from route params/query params
- Pull registrations from existing `useJudgingOverview` or a lighter query
- Render the `Tabs` block (lines 257-312 of current `SubEventWorkspace`) with `ScoreSummaryTable`, `SideBySideScores`, and `VoteAudit`

### 2. Update `src/pages/TabulatorDashboard.tsx`

- Remove the three-tab `Tabs` block (lines 256-312) from `SubEventWorkspace`, keeping everything else (timer, progress bar, judge activity, certification controls, certify dialog, score card exporter)
- Add a navigation link/button "Score Tables" after the Judge Activity section, linking to `/competitions/${competitionId}/score-tables?sub_event=${subEventId}`

### 3. Add route in `src/App.tsx`

- Add `ScoreTablesPage` lazy import and protected route at `/competitions/:id/score-tables`

### 4. Remove auto-save from `src/pages/JudgeScoring.tsx`

**Remove:**
- `autoSaveStatus` state (line 121)
- `autoSaveTimerRef` and `autoSaveStatusTimerRef` refs (lines 123, 125)
- The debounced auto-save `useEffect` (lines 217-236)
- The "Saving…" / "Auto-saved" UI indicators (lines 600-607)

**Add offline cache fallback:**
- Wrap `handleSave` DB call in try/catch; on network failure, serialize scores to `localStorage` key `scorz_pending_scores_{judgeId}_{subEventId}_{contestantId}`
- Show a small "Offline — saved locally" indicator when cached data exists
- Add a `useEffect` listening to `window.addEventListener("online", ...)` that attempts to flush any cached scores back to the database on reconnect
- On page load, check for cached scores and attempt to sync them

### Files to edit
1. `src/pages/ScoreTablesPage.tsx` — **new** — extracted score tabs page
2. `src/pages/TabulatorDashboard.tsx` — remove tabs from SubEventWorkspace, add "Score Tables" link
3. `src/App.tsx` — add route
4. `src/pages/JudgeScoring.tsx` — remove auto-save, add offline cache

