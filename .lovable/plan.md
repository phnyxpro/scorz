

## Redesign Judge/Chief Judge Dashboard Flow

Restructure the judge experience so the Dashboard becomes the central hub with a competition selector and role-specific action cards that lead to dedicated content pages.

---

### 1. Add Competition Selector to Dashboard Header

**File: `src/pages/Dashboard.tsx`**

For users with `judge` or `chief_judge` roles:
- Add a combobox/select dropdown in the top-right area of the dashboard (below the welcome text) that lists competitions the user is assigned to
- Fetch assigned competitions by querying `sub_event_assignments` for the current user, joining through `sub_events` and `competition_levels` to get competition IDs, then matching against `competitions`
- Store selected competition ID in local state; persist in `localStorage` so it remembers across sessions
- When no competition is selected, show a prompt to select one
- When a competition is selected, the dashboard cards change to competition-specific links

---

### 2. Redefine Dashboard Cards for Judge Role

**File: `src/pages/Dashboard.tsx`**

When a competition is selected, show these 4 cards for **judge**:

1. **Score Cards** -- links to `/competitions/:id/score` (the existing JudgeScoring page, which already has contestant selection and slider interface)
2. **Contestant Profiles** -- links to a new route `/competitions/:id/contestants` showing profile cards
3. **Rules** -- links to `/competitions/:id/rules-rubric` (filtered to rules section)
4. **Rubric** -- links to `/competitions/:id/rules-rubric` (filtered to rubric section, or separate anchor)

For **chief_judge**, show the same 4 plus:

5. **Certify Results** -- links to `/competitions/:id/chief-judge` (existing ChiefJudgeDashboard which shows the Master Score Sheet and certification flow)

Remove the generic "My Assignments", "Judging Hub", "Rules and Rubric" cards for these roles. Replace with the dynamic competition-specific cards above.

---

### 3. Upgrade Contestant Selector to Search Combobox

**File: `src/pages/JudgeScoring.tsx`**

Replace the plain `<Select>` for choosing a contestant with a `cmdk`-based `<Command>` combobox (already available via `@/components/ui/command`):
- Type-ahead search by contestant name
- Shows contestant list filtered by the selected sub-event
- Popover-style dropdown that opens on click/focus

---

### 4. Create Contestant Profiles Page

**New file: `src/pages/CompetitionContestants.tsx`**

A page at `/competitions/:id/contestants` that:
- Fetches all approved contestant registrations for the competition
- Displays them as profile cards (photo, name, age category, location, bio snippet)
- Tapping a card navigates to `/profile/:userId` for the full profile view
- Add this route to `src/App.tsx`

---

### 5. Split Rules and Rubric into Separate Deep-Link Targets

**File: `src/pages/RulesAndRubric.tsx`**

Add URL hash support so `/competitions/:id/rules-rubric#rules` scrolls to the rules section and `/competitions/:id/rules-rubric#rubric` scrolls to the rubric section. Add `id` attributes to each section element. The dashboard cards for "Rules" and "Rubric" will link with appropriate hashes.

---

### 6. Update Bottom Navigation

**File: `src/components/AppLayout.tsx`**

Simplify bottom nav for judges/chief judges -- remove the separate "Assignments" and "Judging" entries. The Dashboard card-based flow replaces them. Keep: Dashboard, Events, Profile.

---

### 7. Register New Route

**File: `src/App.tsx`**

Add protected route for `/competitions/:id/contestants` rendering the new `CompetitionContestants` page.

---

### 8. Update Breadcrumbs

**File: `src/components/PageBreadcrumbs.tsx`**

Add label mapping for "contestants" segment.

---

### Technical Summary

- New file: `src/pages/CompetitionContestants.tsx`
- Modified files: `src/pages/Dashboard.tsx`, `src/pages/JudgeScoring.tsx`, `src/pages/RulesAndRubric.tsx`, `src/components/AppLayout.tsx`, `src/App.tsx`, `src/components/PageBreadcrumbs.tsx`
- No database changes needed -- all data already exists in `sub_event_assignments`, `contestant_registrations`, `competitions`, and `rubric_criteria` tables
- Uses existing `cmdk` dependency for the combobox search

