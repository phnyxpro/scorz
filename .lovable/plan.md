

## Timer Enhancements: Drag-and-Drop Reorder, Multi-Tabulator Clocks, Duration in Score Sheets, and On-Stage Broadcasting

### Overview

Four interconnected enhancements to the TabulatorTimer and score display system:

1. **Drag-and-drop contestant reordering** in the timer's contestant list
2. **Multi-tabulator clock display** showing all tabulators' recorded times
3. **Duration column** in ScoreSummaryTable and SideBySideScores
4. **"On Stage" broadcast** from tabulator to judges via realtime

---

### 1. Drag-and-drop contestant reorder — `TabulatorTimer.tsx`

Replace the static contestant pill buttons with a draggable list (same HTML5 drag pattern as `PerformanceOrder.tsx`):
- Add `GripVertical` handle + `draggable` attribute to each contestant row
- On drop, persist new `sort_order` to `contestant_registrations` via supabase update
- Invalidate the query so the parent re-fetches the updated order
- Disable drag while timer is running

### 2. Multi-tabulator clock display — `TabulatorTimer.tsx`

When a contestant is selected and has recorded durations:
- Fetch tabulator profiles for all `performance_durations` entries matching the selected contestant
- Display each tabulator's recorded duration as a small row: `"Tabulator Name — mm:ss"`
- If multiple tabulators recorded, show an "Average" summary line
- This section appears below the timer controls, only when not running

### 3. Duration column in score sheets

**`ScoreSummaryTable.tsx`**:
- Accept new optional prop `durations: PerformanceDuration[]`
- Add a "Duration" column header between the last rubric criterion column and the "Penalty" column
- Display `getAvgDuration(durations, regId)` formatted as `mm:ss` per row

**`SideBySideScores.tsx`**:
- Accept optional `durationSeconds?: number` prop
- Show a small "Duration: mm:ss" badge in the contestant header when provided

**`TabulatorDashboard.tsx` (`SubEventWorkspace`)**:
- Call `usePerformanceDurations(subEventId)` and pass `durations` to `ScoreSummaryTable`
- Compute and pass `durationSeconds` per contestant to `SideBySideScores`

### 4. "On Stage" broadcast — tabulator → judges

Currently, the judge's "On Stage" indicator is local (judges toggle it themselves in `JudgeScoring.tsx`). The user wants tabulators to broadcast who is on stage so judges see it automatically.

**Mechanism**: Use the existing `performance_timer_events` table. When the tabulator selects a contestant (before even starting the timer), insert an event with `event_type: "on_stage"`. When deselected, insert `event_type: "off_stage"`. These are already broadcast via realtime.

**`TabulatorTimer.tsx`**:
- Add an "On Stage" button next to the selected contestant badge (visible when a contestant is selected but timer not yet started)
- On click, insert a `performance_timer_events` row with `event_type: "on_stage"`
- When the timer starts, the existing `start` event already implies "on stage + live"
- When contestant is deselected or changed, insert `off_stage`

**`JudgeScoring.tsx`**:
- Subscribe to `performance_timer_events` realtime (already done via `ReadOnlyTimer`)
- Query the latest timer event for the sub-event; if `event_type` is `on_stage` or `start`, auto-set `onStageContestant` to that contestant and show the "On Stage" badge
- If `event_type` is `start`, also show the "LIVE" badge next to "On Stage"
- Remove the manual per-judge "on stage" toggle button since the tabulator now controls this

**`ReadOnlyTimer.tsx`**:
- Already shows the contestant name and LIVE badge based on timer events
- Extend to also show an "On Stage" badge when the latest event is `on_stage` (timer not yet started)

**`usePerformanceTimer.ts`**:
- Update `useLatestTimerEvent` to also match `on_stage` and `off_stage` event types (no code change needed — it already fetches the latest event regardless of type)

---

### Files changed

| File | Changes |
|---|---|
| `src/components/scoring/TabulatorTimer.tsx` | Drag-and-drop reorder, multi-tabulator durations display, "On Stage" broadcast button |
| `src/components/tabulator/ScoreSummaryTable.tsx` | New "Duration" column |
| `src/components/tabulator/SideBySideScores.tsx` | Optional duration badge |
| `src/pages/TabulatorDashboard.tsx` | Pass durations data to score tables |
| `src/pages/JudgeScoring.tsx` | Auto-set on-stage from realtime events, remove manual toggle, show LIVE badge when timer running |
| `src/components/scoring/ReadOnlyTimer.tsx` | Show "On Stage" badge for `on_stage` events (not just `start`) |

No database migrations needed — reuses existing `performance_timer_events` table with new event type values (`on_stage`, `off_stage`) which are just text strings in the existing `event_type` column.

