

## Plan: Multiple Enhancements to Registration, Timer, and Dashboards

This plan covers 6 distinct changes requested by the user.

---

### 1. Add Arrow Buttons to Reorder Modals (ContestantReorderModal + RegistrationsManager)

**`src/components/scoring/ContestantReorderModal.tsx`**
- Add up/down arrow buttons (`ChevronUp`/`ChevronDown`) next to each contestant row alongside the existing drag handle
- Clicking up moves the contestant one position up; clicking down moves one position down
- Persist order on each arrow click (same `persistOrder` logic)

**`src/components/competition/RegistrationsManager.tsx`**
- Add up/down arrow buttons to each `SortableRow` in the table (next to the GripVertical drag handle)
- Clicking arrows reorders `sort_order` values and invalidates queries

---

### 2. "Move After Last Timed" Icon in Tabulator Timer Contestant Grid

**`src/components/scoring/TabulatorTimer.tsx`**
- For the selected contestant in the paginated grid, add a small icon button (e.g., `ArrowDownToLine`) that moves that contestant to the position right after the last contestant who has a recorded duration
- Determine "last timed" by checking `durations` data for contestants with existing `performance_durations`
- After repositioning, persist `sort_order` and invalidate queries

Also add this action in the `ContestantReorderModal`.

---

### 3. Enhance Quick Add Walk-in Contestant Form

**`src/components/competition/RegistrationsManager.tsx`** (Walk-in Dialog section)
- Add a sub-event `<Select>` dropdown populated from `allSubEvents` so the walk-in can be assigned to an event immediately
- Add a checkbox: "Place after last timed performer" — when checked, sets `sort_order` to position after the last contestant with a recorded duration in that sub-event
- Add an optional number input: "Or choose position #" — allows specifying an exact position, which shifts subsequent contestants down
- On submit, set `sub_event_id` and calculate `sort_order` accordingly

---

### 4. Inline Edit of Contestant Name and Number in Registration Table

**`src/components/competition/RegistrationsManager.tsx`** (SortableRow)
- Make the contestant name clickable to edit inline (show an `<Input>` on click, save on blur/Enter)
- Make the `#` column editable: clicking the number shows a small input; entering a new number (e.g., 5) moves the contestant to position 5 and shifts others accordingly
- Persist name changes via `updateReg` mutation
- Persist number changes by recalculating `sort_order` for all affected contestants in that sub-event filter

---

### 5. Add ConnectionIndicator to ALL Dashboard Headers

The ConnectionIndicator is already present on all 6 dashboards (Dashboard, JudgeDashboard, TabulatorDashboard, ChiefJudgeDashboard, WitnessDashboard, ProductionAssistantDashboard). **No changes needed** — this is already implemented.

---

### 6. Editable Recorded Durations in Performance Timer

**`src/components/scoring/TabulatorTimer.tsx`**
- In the "Recorded Durations" section, make each duration value clickable to edit
- On click, replace the text with a time input (mm:ss format)
- On blur/Enter, update the `performance_durations` table via `supabase.from("performance_durations").update({ duration_seconds: newValue }).eq("id", d.id)`
- Also update `judge_scores.performance_duration_seconds` for that contestant with the new average
- Invalidate duration queries after save

---

### Files to Edit
1. `src/components/scoring/ContestantReorderModal.tsx` — add arrow buttons + "move after last timed" action
2. `src/components/scoring/TabulatorTimer.tsx` — add "move after last timed" icon in grid + editable durations
3. `src/components/competition/RegistrationsManager.tsx` — arrow buttons in rows, inline name/number edit, walk-in form enhancements

