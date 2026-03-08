

## Plan: Use Staff Invitation Names Throughout the App

### Problem
Currently, only `JudgeActivityIndicator.tsx` resolves names using the priority: **staff invitation name → profile full_name → friendly email**. All other pages (TabulatorDashboard, MasterScoreSheet, LevelMasterSheet, JudgingHub, EventChat, ScoreCardExportSection, ScoreSheetDownloads, etc.) use `profile.full_name || email || "Unknown"` directly, ignoring the organiser-entered name from `staff_invitations`.

Additionally, when a staff member signs up, the `staff_invitations.name` should be written to their `profiles.full_name` so it propagates automatically.

### Approach

**1. Write staff invitation name to profile on acceptance**

Update the `accept_staff_invitations` RPC (or add a trigger) so that when a staff member accepts their invitation, if their `profiles.full_name` is NULL, it gets populated from `staff_invitations.name`. This ensures the profile carries the organiser-entered name going forward, reducing the need for runtime lookups.

**Database migration**: Create a trigger function that fires after `staff_invitations.accepted_at` is updated — if the corresponding profile has no `full_name`, copy the invitation `name` into `profiles.full_name`.

**2. Create a shared `useStaffDisplayNames` hook**

Extract the pattern from `JudgeActivityIndicator.tsx` into a reusable hook in `src/hooks/useStaffDisplayNames.ts`:

```ts
function useStaffDisplayNames(userIds: string[]): Map<string, string>
```

It will:
- Fetch profiles for the given user IDs
- Fetch `staff_invitations` by matching profile emails
- Return a Map of `userId → resolved name` using the priority chain

**3. Update all consuming files**

Replace inline name resolution with `useStaffDisplayNames` in:

| File | Current pattern |
|---|---|
| `src/pages/TabulatorDashboard.tsx` | `friendlyDisplayName(p.full_name, p.email)` and `p.full_name \|\| p.email \|\| "Unknown"` |
| `src/pages/MasterScoreSheet.tsx` | `p.full_name \|\| p.email \|\| "Unknown"` |
| `src/pages/LevelMasterSheet.tsx` | `p.full_name \|\| p.email \|\| "Unknown"` |
| `src/pages/JudgingHub.tsx` | `p.full_name \|\| p.email \|\| "Unknown"` |
| `src/hooks/useEventChat.ts` (`useChatStaff`) | `profileMap.get(userId) \|\| "Unknown"` |
| `src/components/chat/EventChat.tsx` | Uses `staffMembers.full_name` |
| `src/components/chat/ChatMessage.tsx` | `message.sender?.full_name \|\| "Unknown"` |
| `src/components/competition/ScoreCardExportSection.tsx` | `p.full_name \|\| "Unknown Judge"` |
| `src/components/competition/ScoreSheetDownloads.tsx` | `p.full_name \|\| "Unknown Judge"` |
| `src/components/scoring/TabulatorTimer.tsx` | Already uses `friendlyDisplayName` but no staff lookup |
| `src/components/public/LevelParticipants.tsx` | `friendlyDisplayName(j.full_name, null)` |

### Files Changed
- **Migration**: Trigger to copy `staff_invitations.name` → `profiles.full_name` on acceptance
- **`src/hooks/useStaffDisplayNames.ts`** (new): Shared hook for staff name resolution
- **10+ consuming files**: Replace inline name lookups with the shared hook or update `useChatStaff` to include staff invitation names

