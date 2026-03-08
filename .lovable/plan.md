

## Plan: Production Assistant — Organizer Flag with Limited Dashboard

Production Assistants are organisers assigned with a `is_production_assistant` flag. They see a dedicated dashboard scoped to the entire competition, showing the contestant list in performance order with status management (No Show, Disqualified, Drop Out, Reinstate).

### Database Changes

1. **Add `is_production_assistant` column to `staff_invitations`**
   ```sql
   ALTER TABLE public.staff_invitations
     ADD COLUMN is_production_assistant boolean NOT NULL DEFAULT false;
   ```

2. **Add `is_production_assistant` column to `sub_event_assignments`**
   ```sql
   ALTER TABLE public.sub_event_assignments
     ADD COLUMN is_production_assistant boolean NOT NULL DEFAULT false;
   ```

3. **Update `accept_staff_invitations` function** to carry the `is_production_assistant` flag from invitations into assignments.

### Frontend Changes

**1. Staff Roster (`SubEventAssignments.tsx`)**
- When role is `organizer`, show a "Production Assistant" checkbox (same pattern as Chief Judge checkbox for judges)
- Pass `is_production_assistant` flag when creating/editing staff invitations
- Show a "Production Assistant" badge on the roster row when flagged

**2. New page: `ProductionAssistantDashboard.tsx`**
- Uses `useStaffView` pattern (or direct query via `get_assigned_competitions` RPC) to find assigned competitions
- Fetches all registrations for the competition, filtered to `approved` status by default
- Displays a table with: Order #, Name, Age Category, Sub-Event, Status
- Status action buttons: No Show, Disqualified, Drop Out, Reinstate (calls existing `withdraw_contestant` RPC — already allows organizer role)
- Sorted by `sort_order` (performance order)

**3. Badge in Header (`AppLayout.tsx`)**
- Query `sub_event_assignments` or `staff_invitations` for `is_production_assistant = true` (same pattern as chief judge badge check)
- Display "Production Assistant" badge pill in header

**4. Dashboard Card (`navigation.ts`)**
- Add a "Production Assistant" card for the `organizer` role pointing to the new dashboard

**5. Routing (`App.tsx`)**
- Add route: `/production-assistant` → `ProductionAssistantDashboard`

**6. Navigation (`navigation.ts` + `AppLayout.tsx`)**
- Add nav item for production assistants pointing to the dashboard

### Files to Create/Edit
- **Migration**: Add columns + update `accept_staff_invitations` RPC
- **Create**: `src/pages/ProductionAssistantDashboard.tsx`
- **Edit**: `src/components/competition/SubEventAssignments.tsx` (checkbox + badge)
- **Edit**: `src/hooks/useStaffInvitations.ts` (include new field in type)
- **Edit**: `src/components/AppLayout.tsx` (badge detection)
- **Edit**: `src/lib/navigation.ts` (dashboard card)
- **Edit**: `src/App.tsx` (route)

