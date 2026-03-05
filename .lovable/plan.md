

## Plan: Merge Assignments and Invitations into a Single "Staff" Tab

### Current State
- **Assignments tab**: Select Level → Sub-Event → Role → pick existing user → assign (with chief/responsibility options)
- **Invitations tab**: Enter email → select role → send invite (competition-scoped, no sub-event context)

These are separate tabs doing related work. The user wants a unified flow: select Level → Sub-Event → Role, then either assign an existing user OR invite a new one by email.

### Approach
Merge both into a single "Staff" tab that combines the two workflows with a toggle/segmented control.

### Changes

**1. `src/components/competition/SubEventAssignments.tsx` — Merge invitation UI into this component**
- Rename conceptually to "Staff" (keep filename or rename)
- After the Level → Sub-Event → Role selectors, add a segmented toggle: **"Assign Existing User"** | **"Invite by Email"**
- **Assign Existing User** path: current user dropdown + chief/responsibility options (unchanged)
- **Invite by Email** path: email input + chief toggle (for judges) + send invite button. Uses `useInviteStaff` hook
- Below the add form, show two sections:
  - Current assignments table (existing, unchanged)
  - Pending invitations list filtered to the selected competition, showing status badges

**2. `src/pages/CompetitionDetail.tsx` — Merge tabs**
- Remove the separate "Invitations" `TabsTrigger` and `TabsContent`
- Rename "Assignments" tab label to "Staff"
- Remove `StaffInvitationForm` import

**3. No database changes needed** — both `sub_event_assignments` and `staff_invitations` tables remain as-is.

### UI Layout (merged tab)

```text
┌─────────────────────────────────────────────┐
│  Staff Assignments                          │
├─────────────────────────────────────────────┤
│  Level: [▼ Select]    Sub-Event: [▼ Select] │
│                                             │
│  Role: [▼ Select]                           │
│                                             │
│  ┌──────────────────┬─────────────────┐     │
│  │ Assign Existing  │ Invite by Email │     │
│  └──────────────────┴─────────────────┘     │
│                                             │
│  [User dropdown] [Chief toggle] [Assign]    │
│  — or —                                     │
│  [Email input] [Chief toggle] [Send Invite] │
│                                             │
│  ─── Current Assignments ───                │
│  | User | Role | Chief | [x] |              │
│                                             │
│  ─── Pending Invitations ───                │
│  | email@... | judge | Pending | [trash] |  │
└─────────────────────────────────────────────┘
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/competition/SubEventAssignments.tsx` | Add invite-by-email mode, import invitation hooks, show pending invitations |
| `src/pages/CompetitionDetail.tsx` | Remove "Invitations" tab, rename "Assignments" to "Staff", remove `StaffInvitationForm` import |

