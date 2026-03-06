

## Plan: Add General Penalties and Disqualification Rules

The current system only supports time-based penalty tiers (stored in `penalty_rules`). We need a new table for general penalties/disqualifications that are not time-related — things like "Using Props: -20 pts" or "Plagiarism: Disqualification".

### Database Change

**New table: `competition_infractions`**

| Column | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| competition_id | uuid | NOT NULL |
| category | text | 'penalty' | — `penalty` or `disqualification` |
| title | text | NOT NULL |
| description | text | NULL |
| penalty_points | numeric | 0 | — points deducted (0 for disqualifications) |
| sort_order | integer | 0 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: Same pattern as `penalty_rules` — admins/organizers can manage, anyone can view.

### Code Changes

**1. `src/hooks/useCompetitions.ts`**
- Add `Infraction` interface, `useInfractions` query hook, `useCreateInfraction`, `useUpdateInfraction`, `useDeleteInfraction` mutations.

**2. `src/components/competition/PenaltyConfig.tsx`**
- Below the existing time penalty tiers, add two new sections: **General Penalties** and **Disqualification Rules**.
- Each section lists existing rules with delete buttons and has an "Add" form (title, description, points for penalties / title+description for disqualifications).

**3. `src/pages/PenaltiesPage.tsx`**
- Expand the public-facing penalties page to show three sections: Time Penalties (existing), General Penalties, and Disqualification Rules, each in its own card.

**4. `src/components/public/PublicRubric.tsx`** (if infractions are shown there)
- No changes needed — the standalone Penalties page handles display.

### No scoring engine changes needed
These infractions are applied manually by the chief judge (via the existing penalty adjustment flow or future infraction-tracking UI) rather than auto-calculated like time penalties.

