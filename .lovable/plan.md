

## Plan: Enhance Public Event Page with Accessible Contestants, Judges, Voting Toggle, and Separated Rules/Rubric

### Summary

The public event detail page needs several improvements:
1. Contestants and Judges tabs already exist but may have RLS issues for unauthenticated users -- need to verify and fix
2. Voting tab should only appear when voting is enabled via a backend toggle (new `voting_enabled` column on `competitions`)
3. Rules and Rubric should be split into two separate tabs instead of one combined "Rules" tab
4. Rubric and Rules should also be accessible from the contestant profile and judge dashboard views

### Changes

#### 1. Database Migration: Add `voting_enabled` column to `competitions`

Add a boolean column `voting_enabled` (default `false`) to `competitions`. Organizers/admins can toggle this on to activate the People's Choice voting on the public page.

```sql
ALTER TABLE public.competitions ADD COLUMN voting_enabled boolean NOT NULL DEFAULT false;
```

#### 2. Update `PublicEventDetail.tsx` -- Split Rules/Rubric and Conditionally Show Voting

- Split the current "Rules" tab into two separate tabs: **Rules** (official handbook link) and **Rubric** (scoring criteria + penalties)
- Only render the "Voting" tab and its content when `comp.voting_enabled === true`
- Both Contestants and Judges tabs already work via `PublicRoleList`; no changes needed there

#### 3. Update `CompetitionDetail.tsx` -- Add voting toggle for organizers

Add a switch/checkbox in the competition management page so admins/organizers can toggle `voting_enabled` on/off.

#### 4. Add Rubric and Rules visibility to Contestant and Judge views

- In `ContestantProfile.tsx`: Add a tab or section showing the competition's rubric criteria and rules link (reuse `PublicRubric` component)
- In `JudgeDashboard.tsx` / `JudgeScoring.tsx`: Add a collapsible or linked section showing the rubric and rules for the competition being judged (reuse `PublicRubric` component)

#### 5. Update Supabase types

The types file will auto-regenerate after the migration to include `voting_enabled`.

### Technical Details

**Files to modify:**
- `supabase/migrations/` -- new migration for `voting_enabled` column
- `src/pages/PublicEventDetail.tsx` -- split Rules/Rubric tabs, conditional voting tab based on `comp.voting_enabled`
- `src/pages/CompetitionDetail.tsx` -- add voting toggle switch for organizers
- `src/pages/ContestantProfile.tsx` -- add Rubric/Rules tab using `PublicRubric` component
- `src/pages/JudgeDashboard.tsx` -- add rubric/rules access per competition
- `src/pages/JudgeScoring.tsx` -- add collapsible rubric reference panel

**Components reused:**
- `PublicRubric` -- already renders criteria + penalties, will be reused in contestant and judge views
- `PublicRoleList` -- already handles contestants and judges display, no changes needed

**RLS considerations:**
- The `competitions` table already has a public SELECT policy for active competitions, so `voting_enabled` will be readable
- `rubric_criteria` and `penalty_rules` already have public/authenticated SELECT policies

