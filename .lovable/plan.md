

## Plan: Remove from Sub-Event on Withdrawal + Connection Status Icon

### 1. Update `withdraw_contestant` DB Function

Add `sub_event_id = NULL` when withdrawing (status != 'approved'). This removes the contestant from the sub-event listing that judges see.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.withdraw_contestant(...)
  -- existing logic, plus:
  IF _new_status != 'approved' THEN
    UPDATE public.contestant_registrations
    SET status = _new_status, sub_event_id = NULL, updated_at = now()
    WHERE id = _registration_id;
    -- ... existing deletes
  END IF;
```

This ensures withdrawn contestants no longer appear in any sub-event-filtered queries (judge scoring, tabulator timer, etc.).

### 2. Create `ConnectionIndicator` Component

A small shared component that shows a wifi/signal icon reflecting the browser's online status using `navigator.onLine` + `online`/`offline` events.

- Green wifi icon when online
- Red/muted wifi-off icon when offline
- Tooltip showing "Connected" / "Offline"

**File:** `src/components/shared/ConnectionIndicator.tsx`

### 3. Add Connection Icon to Dashboard Headers

Insert `<ConnectionIndicator />` into the header area of each dashboard page:

- `src/pages/Dashboard.tsx` — main dashboard header
- `src/pages/JudgeDashboard.tsx` — judge dashboard header
- `src/pages/TabulatorDashboard.tsx` — tabulator workspace headers
- `src/pages/ChiefJudgeDashboard.tsx` — chief judge header
- `src/pages/WitnessDashboard.tsx` — witness header
- `src/pages/ProductionAssistantDashboard.tsx` — PA header

### Files to Create/Edit
- **Migration**: Update `withdraw_contestant` to set `sub_event_id = NULL` on withdrawal
- **Create**: `src/components/shared/ConnectionIndicator.tsx`
- **Edit**: 6 dashboard pages (add ConnectionIndicator to headers)

