

## Add Chat Icon with Modal to Judge Scoring Page Header

### Current State
- **TabulatorDashboard**: Already has a chat button with unread badge in the header, plus a Dialog modal for `EventChat`. No changes needed here.
- **JudgeScoring**: Has no chat functionality. Needs a chat icon button added to the header row, plus a modal.

### Changes

**`src/pages/JudgeScoring.tsx`**

1. Import `EventChat`, `useChatUnreadCount`, and `MessageSquare` (MessageSquare is not currently imported)
2. Add `useChatUnreadCount(competitionId)` hook call
3. Add `showChatModal` state
4. In the header row (line ~412, the `flex items-center gap-2` div), add a `MessageSquare` icon button with unread badge — placed after the existing badges (On Stage, LIVE, contestant name)
5. Add a `Dialog` at the bottom of the component containing `EventChat` (same pattern as TabulatorDashboard)

The button will be a ghost/outline icon button with `MessageSquare`, showing an unread count badge when > 0. Visible to all roles (judge, admin, organizer, tabulator) since the `EventChat` component and its RLS policies already restrict access to competition staff.

### Files changed
| File | Changes |
|---|---|
| `src/pages/JudgeScoring.tsx` | Add chat icon button in header, chat modal dialog, unread count hook |

