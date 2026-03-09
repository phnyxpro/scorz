

## Plan: Level Completion Badge on Tabulator Dashboard + Fix Auto-Advancement

### Problem Analysis

1. **`useLevelCompletion` only checks chief judge certifications** — it does NOT verify tabulator or witness certifications. The certification chain requires all three (Chief Judge → Tabulator → Witness) to consider a level truly complete.

2. **No level completion badge on Tabulator Dashboard** — the level tabs show level names but no visual indication of completion status.

3. **No auto-advancement trigger** — promotion is only available as a manual button on the Level Master Sheet page. The user expects that once all certifications are done, contestants automatically appear in the next level.

---

### Changes

#### 1. Fix `useLevelCompletion` to check all three certification types

**File:** `src/hooks/useLevelAdvancement.ts`

Update the `useLevelCompletion` hook to verify that every sub-event in the level has:
- A chief judge certification with `is_certified = true`
- A tabulator certification with `is_certified = true`  
- A witness certification with `is_certified = true`

Only when all three exist for every sub-event is the level considered "complete".

#### 2. Add completion badge to Tabulator Dashboard level tabs

**File:** `src/pages/TabulatorDashboard.tsx`

- Import `useLevelCompletion` from the advancement hook
- Create a small `LevelTabLabel` component rendered inside each `TabsTrigger` that calls `useLevelCompletion(level.id)` and shows a green `CheckCircle` icon + "Complete" badge next to the level name when all certifications are done
- Show a progress indicator (e.g., "2/3 certified") when partially complete

#### 3. Auto-promote contestants when level completes

**File:** `src/pages/TabulatorDashboard.tsx`

- After the level completion badge detects a complete level, show a banner inside the `TabsContent` with the "Promote" button (same pattern as `LevelMasterSheet.tsx`)
- Fetch the competition's `scoring_method`, `advancement_count` from the level, and `nextLevel` using existing hooks
- Wire up `usePromoteContestants` mutation to the button

This keeps promotion as a deliberate manual action (button click) rather than fully automatic, which is safer since accidentally auto-promoting could create unwanted registrations. The banner will be prominent enough that the tabulator sees it immediately.

#### 4. Add realtime refresh for completion status

**File:** `src/pages/TabulatorDashboard.tsx`

The existing realtime subscriptions for `chief_judge_certifications`, `tabulator_certifications`, and `witness_certifications` should invalidate `level_completion` queries so the badge updates live when any certification changes.

### Files Modified
1. `src/hooks/useLevelAdvancement.ts` — update completion check to include all 3 certification types
2. `src/pages/TabulatorDashboard.tsx` — add completion badge to level tabs, promotion banner, and realtime invalidation

