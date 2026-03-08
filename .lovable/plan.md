

## Plan: Navigate to Competition Staff Tab on Masquerade Exit

### Problem
When exiting masquerade mode, the user is left on whatever page they were viewing. They should be returned to the competition settings page on the **Staff** tab for the event they were masquerading from.

### Changes

**1. Extend `MasqueradeTarget` to include `competitionId`** — `src/contexts/AuthContext.tsx`
- Add optional `competitionId?: string` to the `MasqueradeTarget` interface.

**2. Make CompetitionDetail tabs URL-driven** — `src/pages/CompetitionDetail.tsx`
- Read a `tab` search param (e.g. `?tab=assignments`) and use it as the controlled/default value for the `<Tabs>` component so navigation can target a specific tab.

**3. Pass `competitionId` when starting masquerade** — `src/components/competition/SubEventAssignments.tsx`
- Include `competitionId` in the `startMasquerade()` call (it's already available as a prop).

**4. Navigate on exit in AppLayout** — `src/components/AppLayout.tsx`
- When the Exit button is clicked, read `masquerade.competitionId` before calling `stopMasquerade()`, then `navigate(`/competitions/${compId}?tab=assignments`)`.

**5. Pass `competitionId` from Admin masquerade entry points** — `src/pages/AdminUsers.tsx`, `src/pages/AdminPanel.tsx`
- These don't have a competition context, so no `competitionId` is passed — fallback navigates to `/dashboard` (current behavior).

### Summary of file touches
| File | Change |
|------|--------|
| `AuthContext.tsx` | Add `competitionId?` to `MasqueradeTarget` |
| `CompetitionDetail.tsx` | Read `?tab` search param for default tab |
| `SubEventAssignments.tsx` | Pass `competitionId` in `startMasquerade` |
| `AppLayout.tsx` | Navigate to competition staff tab on exit |

