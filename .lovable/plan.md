

## Plan: Level Completion, Advancement Flow, Standby Tags, Countdowns & Final Round Toggle

### Summary
Five interconnected changes: (1) Auto-mark a level as "completed" when all its sub-events are certified, and auto-advance top contestants to the next level. (2) Tag 2 contestants after the last advancing position as "Standby". (3) Show countdowns to sub-events or "In Progress" indicators in the schedule. (4) Add an `is_final_round` toggle to the level settings, with champion placement badges (1st, 2nd, 3rd) on the Level Master Sheet for final rounds.

---

### 1. Database Migration

Add `is_final_round` boolean to `competition_levels`:

```sql
ALTER TABLE public.competition_levels
ADD COLUMN IF NOT EXISTS is_final_round boolean NOT NULL DEFAULT false;
```

No new tables needed. Level "completion" will be derived at runtime by checking if all sub-events in the level have chief judge certifications with `is_certified = true` (no new column for level status).

### 2. Auto-Advancement Logic

**File:** New hook `src/hooks/useLevelAdvancement.ts`

A hook/utility that, given a completed level:
- Fetches ranked contestants from the level's scores (same logic as Level Master Sheet)
- Takes the top `advancement_count` contestants and copies/moves their registrations to the next level (by `sort_order`) — specifically, updates their `sub_event_id` to a sub-event in the next level (or creates a pending assignment)
- Also includes contestants with `special_entry_type` (previous winners, wild cards, sub-competition winners) already registered in the next level
- Triggered manually by admin/organizer via a "Promote Advancing Contestants" button, or automatically when all sub-events in a level are fully certified

**File:** `src/pages/LevelMasterSheet.tsx`

- After detecting all sub-events certified, show a banner: "Level Complete — All sub-events certified"
- Show a "Promote Top N to [Next Level Name]" button for admin/organizer
- On click, duplicate contestant_registrations into the next level's first sub-event with status `approved`

### 3. Standby Tags

**Files:** `src/pages/LevelMasterSheet.tsx`, `src/components/tabulator/MasterSheetExporter.tsx`, `src/pages/MasterScoreSheet.tsx`

After the last advancing contestant (position = `advancement_count`), tag the next 2 contestants (positions `advancement_count + 1` and `advancement_count + 2`) with a yellow/amber "Standby" badge in the Rank column. In exports, add "Standby" to the Advances column for those rows.

### 4. Sub-Event Countdown / In Progress Indicators

**File:** `src/components/competition/LevelsManager.tsx` (SubEventsPanel, lines 190-215)

For each sub-event in the schedule view, compute:
- If `event_date` + `start_time` is in the future → show countdown (e.g., "Starts in 2d 5h")
- If current time is between `start_time` and `end_time` on `event_date` → show pulsing "In Progress" badge
- If `event_date` + `end_time` is in the past → show "Completed" badge (or check certification status)

Use a `useEffect` with a 60-second interval to update countdowns live.

### 5. Final Round Toggle & Champion Placements

**File:** `src/components/competition/LevelsManager.tsx` (LevelAdvancementSettings)

- Add a `Switch` toggle: "Final Round" — saves `is_final_round` to the level
- When enabled, hide the "Contestants advancing" input (no advancement from final round)
- Show note: "Champion placements (1st, 2nd, 3rd) will be shown on the master sheet"

**File:** `src/pages/LevelMasterSheet.tsx`

- If `data.level.is_final_round` is true:
  - Replace "Advances" badge with placement badges: 🥇 Champion (rank 1), 🥈 2nd Place (rank 2), 🥉 3rd Place (rank 3)
  - Use gold/silver/bronze color variants
  - In exports, use "Champion", "2nd Place", "3rd Place" text

**File:** `src/pages/MasterScoreSheet.tsx` — same placement logic for final rounds

### Files Modified
1. `src/components/competition/LevelsManager.tsx` — final round toggle, sub-event countdowns
2. `src/pages/LevelMasterSheet.tsx` — standby tags, champion placements, level completion banner + promote button
3. `src/pages/MasterScoreSheet.tsx` — standby tags, champion placements
4. `src/components/tabulator/MasterSheetExporter.tsx` — standby in exports
5. `src/hooks/useLevelAdvancement.ts` — new hook for promoting contestants
6. `src/integrations/supabase/types.ts` — auto-updated after migration

### Database Migration
```sql
ALTER TABLE public.competition_levels
ADD COLUMN IF NOT EXISTS is_final_round boolean NOT NULL DEFAULT false;
```

