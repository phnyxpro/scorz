

## Plan: Contestant Feedback Dashboard Card & Page

### What We're Building
A new "Feedback" dashboard action card for contestants that links to a dedicated `/feedback` page. On that page, the contestant selects a competition, then sees:
1. **Judge Feedback** -- comments and scores from judges (only for certified sub-events, per existing RLS)
2. **People's Choice** -- vote counts, with a toggle (controlled by organizer/admin) to show or hide this data from the contestant

### Database Change
Add a `show_peoples_choice_to_contestants` boolean column to the `competitions` table (default `false`). Organizers toggle this on/off from the competition settings page.

**Migration:**
```sql
ALTER TABLE competitions ADD COLUMN show_peoples_choice_to_contestants boolean NOT NULL DEFAULT false;
```

### Files to Create

**`src/pages/ContestantFeedback.tsx`** -- New page:
- Fetches the contestant's registrations (reuses `useContestantRegistrations`)
- Competition selector dropdown (filters to competitions they're registered in)
- Once selected, fetches:
  - Judge scores for their registration IDs in that competition (reuses `useContestantScores` pattern, filtered to certified only)
  - Rubric criteria names for the competition
  - People's Choice vote counts (reuses `useContestantVotes` pattern)
  - The competition's `show_peoples_choice_to_contestants` flag
- Renders judge feedback as cards showing: judge comments, criterion scores, final score
- Renders People's Choice section with vote count, only visible when the competition toggle is `true`

### Files to Modify

1. **`src/lib/navigation.ts`** -- Add a dashboard card:
   ```
   { title: "Feedback", desc: "View judge & audience feedback", icon: MessageSquare, color: "text-secondary", to: "/feedback", roles: ["contestant"] }
   ```

2. **`src/App.tsx`** -- Add route `/feedback` pointing to `ContestantFeedback`

3. **`src/pages/CompetitionDetail.tsx`** -- Add a toggle in the competition settings for "Show People's Choice votes to contestants" that updates `show_peoples_choice_to_contestants`

### UI Layout (Feedback Page)

- Header with back button + "My Feedback" title
- Competition selector (Select dropdown)
- Two sections below:
  - **Judge Scores & Comments** -- table/cards showing each judge's scores per criterion, comments, and final score (only certified scores visible per RLS)
  - **People's Choice** -- vote count badge, shown only when toggle is on; otherwise a message "People's Choice results are not yet available"

