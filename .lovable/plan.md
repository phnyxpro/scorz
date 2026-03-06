

## Plan: Merge Sub-Event Assignments into Staff Roster

### Analysis

Both tabs manage the same thing — staff assigned to sub-events. Here's what's unique to each:

| Feature | Staff Roster | Sub-Event Assignments |
|---|---|---|
| Add staff by email/name/phone | Yes | No |
| Invite / Resend / Delete | Yes | No |
| Masquerade (View as) | Yes | No |
| Inline sub-event assignment per person | Yes | No |
| Status grouping (Not Invited / Pending / Accepted) | Yes | No |
| Assign existing platform users to sub-event | No | Yes |
| Tier limits progress bar (judge/tabulator counts) | No | Yes |
| View assignments filtered by sub-event | No | Yes |

### What to do

**Keep the Staff Roster as the single view** (remove the Tabs wrapper entirely) and add the two missing features:

1. **Tier Limits Display** — Add the staff count progress bar (judges X/Y, tabulators X/Y) at the top of the roster, above the "Add Staff Member" card. This gives visibility into plan limits.

2. **Remove the "Assign existing platform users" flow** — This is redundant. Staff should be added through the roster (by email), which auto-creates accounts if needed. The inline sub-event assignment on each StaffRow already handles sub-event mapping.

   *If you want to keep the ability to assign existing platform users, let me know and I'll add an "Import existing user" option to the Add Staff form instead.*

### Technical Changes

**File: `src/components/competition/SubEventAssignments.tsx`**
- Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` wrapper
- Remove the entire "assign" tab content (lines ~367-604)
- Remove state variables for sub-event assignment form (`selectedLevelId`, `selectedSubEventId`, `selectedUserId`, `selectedRole`, `isChief`, `activeTab`)
- Remove `useSubEventAssignments`, `useAddAssignment`, `useRemoveAssignment` imports (no longer needed)
- Remove `useAssignableUsers` import
- Add tier limits progress section above the "Add Staff Member" card, showing judge and tabulator counts vs limits
- Keep everything else (StaffRow, SubEventBadge, add staff form, invitation grouping, masquerade)

Component rename is optional but the file can stay as-is for now.

