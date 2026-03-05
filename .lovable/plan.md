

## Plan: Separate Rules/Rubric/Penalties Pages + Chief Judge as Assignment-Level Flag

### Part 1: Separate Pages for Rules, Rubric, and Penalties

Currently the Judge Dashboard has an inline collapsible showing rules + rubric together, and the Chief Judge Dashboard has no direct link. The existing `RulesAndRubric` page at `/competitions/:id/rules-rubric` already renders all three (rules, rubric, penalties) in one page.

**Approach:** Split the existing `RulesAndRubric` page into three distinct pages/routes, and link to them from both dashboards.

**New routes:**
- `/competitions/:id/rules` -- Official rules (description, handbook URL, uploaded document)
- `/competitions/:id/rubric` -- Scoring rubric criteria cards
- `/competitions/:id/penalties` -- Time penalty rules table

**Changes:**
1. **Create 3 new page components** (`RulesPage.tsx`, `RubricPage.tsx`, `PenaltiesPage.tsx`) extracting the relevant sections from the current `RulesAndRubric.tsx`.
2. **Update `App.tsx`** to add the 3 new routes (keep the old `/rules-rubric` route as a redirect or remove it).
3. **Update `JudgeDashboard.tsx`**: Replace the inline collapsible with 3 link buttons (Rules, Rubric, Penalties) per competition. Also update the SubEventCard footer links.
4. **Update `ChiefJudgeDashboard.tsx`**: Add 3 quick-link buttons in the header area linking to Rules, Rubric, and Penalties for the current competition.

---

### Part 2: Chief Judge as Assignment-Level Flag

Instead of `chief_judge` being a separate `app_role`, it becomes a flag on the `sub_event_assignments` table. A judge assigned to a sub-event can be flagged as "chief" for that specific sub-event.

**Database migration:**
1. Remove `chief_judge` from the `app_role` enum.
2. Add an `is_chief` boolean column (default `false`) to `sub_event_assignments`.
3. Migrate existing `chief_judge` assignments: convert any rows with `role = 'chief_judge'` to `role = 'judge', is_chief = true`.
4. Clean up `user_roles` entries with `role = 'chief_judge'` -- convert to `judge`.
5. Update `has_role` / `has_any_role` -- create a new helper function `is_chief_judge(uuid, uuid)` that checks if a user is assigned as chief for a given sub-event.
6. Update RLS policies on `chief_judge_certifications` and `judge_scores` to use the new `is_chief` check instead of role-based checks.

**Frontend changes:**
1. **`SubEventAssignments.tsx`**: Remove `chief_judge` from `ASSIGNABLE_ROLES`. When role is `judge`, show a "Chief Judge" checkbox/toggle. Display a "Chief" badge on flagged assignments.
2. **`AuthContext.tsx`** and **`navigation.ts`**: Remove `chief_judge` from `AppRole` type. The nav item for "Judging" only needs `["judge"]`.
3. **`useStaffView.ts`**: Filter by `judge` role only; expose `is_chief` from assignments.
4. **`JudgeDashboard.tsx`**: For sub-events where the user `is_chief`, show a "Chief Judge" badge and a link to the Chief Judge Dashboard.
5. **`ChiefJudgeDashboard.tsx`**: Gate access by checking `is_chief` on the assignment for the selected sub-event, not by role.
6. **`useChiefJudge.ts`**: Update certification queries -- no role change needed since the table name stays `chief_judge_certifications`.
7. **`JudgeScoring.tsx`**: Change assignment filter from `["judge", "chief_judge"]` to just `"judge"`.
8. **`StaffInvitationForm.tsx`**: Remove `chief_judge` from role options.
9. **`AdminPanel.tsx`**: Remove `chief_judge` from role assignment UI.
10. **Dashboard cards**: Remove chief_judge-specific references; judges with chief assignments see the chief dashboard link contextually.
11. **`PostEventPortal.tsx`**: Update certification flow references.
12. **`Competitions.tsx`**: Update any chief_judge role checks.
13. **`useDashboardStats.ts`**: Remove chief_judge references.
14. **Seed function**: Update demo data to use `is_chief` flag instead of `chief_judge` role.

**RLS policy updates (migration):**
- `chief_judge_certifications`: Change policy to check `is_chief` on `sub_event_assignments` for the relevant sub-event instead of `has_role(uid, 'chief_judge')`.
- `judge_scores` "Admins and chiefs can view all scores": Replace `chief_judge` with a sub-event-scoped chief check or grant all judges SELECT on scores they're assigned to.

---

### Summary of files to create/modify

| File | Action |
|------|--------|
| `src/pages/RulesPage.tsx` | Create |
| `src/pages/RubricPage.tsx` | Create |
| `src/pages/PenaltiesPage.tsx` | Create |
| `src/App.tsx` | Add 3 routes |
| `src/pages/JudgeDashboard.tsx` | Replace collapsible with links |
| `src/pages/ChiefJudgeDashboard.tsx` | Add rules/rubric/penalties links |
| `src/lib/navigation.ts` | Remove chief_judge from AppRole |
| `src/contexts/AuthContext.tsx` | Remove chief_judge from type |
| `src/hooks/useStaffView.ts` | Remove chief_judge, expose is_chief |
| `src/hooks/useSubEventAssignments.ts` | Update assignable roles query |
| `src/hooks/useChiefJudge.ts` | Update access checks |
| `src/hooks/useDashboardStats.ts` | Remove chief_judge |
| `src/pages/JudgeScoring.tsx` | Filter by judge only |
| `src/pages/Competitions.tsx` | Update role checks |
| `src/pages/PostEventPortal.tsx` | Update certification flow |
| `src/pages/AdminPanel.tsx` | Remove chief_judge role option |
| `src/components/admin/StaffInvitationForm.tsx` | Remove chief_judge |
| `src/components/competition/SubEventAssignments.tsx` | Add is_chief toggle |
| `supabase/functions/seed-demo-data/index.ts` | Update demo data |
| Database migration | Remove enum value, add is_chief column, update RLS |

