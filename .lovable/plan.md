

## Plan: Organizer Contestant Detail View

### Problem
The current `RegistrationsManager` shows a table of registrations but organizers cannot click into a contestant to view their full profile and registration details (bio, photo, guardian info, signatures, social handles, video, etc.).

### Approach
Add a slide-out detail panel (Sheet) to the `RegistrationsManager`. When an organizer clicks a contestant row, a side panel opens showing the full registration record and a link to the contestant's profile page.

### Changes

**1. Modify `src/components/competition/RegistrationsManager.tsx`**
- Import `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from the UI library.
- Add state for `selectedRegistration`.
- Make contestant name in the table clickable to open the sheet.
- The sheet displays:
  - Profile photo (if uploaded)
  - Full name, email, phone, location, age category
  - Bio
  - Social handles (rendered as links)
  - Performance video URL (link)
  - Guardian info (name, email, phone) for minors
  - Rules acknowledgement status and timestamp
  - Contestant signature status and timestamp
  - Guardian signature status and timestamp
  - Registration date and status
  - Sub-event assignment
  - Link to full profile page (`/profile/:userId`)
  - Approve/Reject actions directly in the panel

### Files Changed
- **Modified**: `src/components/competition/RegistrationsManager.tsx` — add detail sheet panel

