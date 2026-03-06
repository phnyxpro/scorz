

## Add Performance Timer to Tabulator Dashboard

The existing `PerformanceTimer` component is already built and used in `JudgeScoring.tsx`. The Tabulator Dashboard just needs to import and display it prominently.

### Changes

**`src/pages/TabulatorDashboard.tsx`**

1. Import `usePenaltyRules` from `useCompetitions` and `PerformanceTimer` from `scoring/PerformanceTimer`
2. Import `Timer` icon from lucide-react
3. Fetch penalty rules: `const { data: penalties } = usePenaltyRules(competitionId)`
4. Derive `timeLimitSecs` and `gracePeriodSecs` from the first penalty rule (same pattern as `JudgeScoring.tsx`)
5. Add `performanceDuration` state to track the elapsed time
6. Place the `PerformanceTimer` component prominently inside the `selectedSubEventId` block, right after the certification chain badges and before the Scoring Progress bar -- making it the most visible element when a sub-event is selected
7. Add a small label/header above it: "Performance Timer" with the Timer icon and a hint about spacebar shortcut

The timer will use the competition's configured time limit and grace period, change color when exceeding limits (already built into `PerformanceTimer`), and support spacebar start/stop.

