

# Competition Categories, Hierarchy & Special Awards

## Overview

Three interconnected features: (1) a category-based tree structure as an alternative to flat sub-events, (2) category-level advancement for finals, and (3) a special awards voting system for judges in final rounds.

## Current Architecture

```text
Competition → Levels → Sub-Events → Registrations/Scores/Certifications
```

All scoring, certifications, assignments, tickets, and timers are keyed to `sub_event_id`. This FK is deeply embedded across 15+ tables.

## Design Approach

Rather than replacing sub-events, **categories are a tree that generates sub-events at the leaf level**. This preserves the entire scoring/certification pipeline unchanged.

```text
Level (structure_type = "categories")
 └─ Category: "Solos" (parent_id = null)
     ├─ "Male" (parent_id = Solos)
     │   ├─ "11-15" (leaf → auto-creates sub_event)
     │   └─ "16-19" (leaf → auto-creates sub_event)
     └─ "Female"
         ├─ "11-15" (leaf → auto-creates sub_event)
         └─ "16-19" (leaf → auto-creates sub_event)
```

Leaf categories have a 1:1 link to a sub_event record, so judges, tabulators, registrations, and scoring work exactly as today.

---

## Part 1: Category Tree Structure

### Database Changes

**New table: `competition_categories`**
- `id`, `level_id` (FK → competition_levels), `parent_id` (FK → self, nullable)
- `name`, `sort_order`, `sub_event_id` (FK → sub_events, nullable — only set on leaf nodes)
- `color` (optional, for visual distinction in the tree)
- RLS: same as competition_levels (staff access)

**Alter `competition_levels`**: add `structure_type text NOT NULL DEFAULT 'sub_events'` — values: `'sub_events'` or `'categories'`

### UI Changes

**LevelsManager.tsx** — Inside each level's collapsible content:
- Add a toggle/selector at the top: "Sub-Events" vs "Categories" (sets `structure_type`)
- When "Categories" is selected, hide the current `SubEventsPanel` and show a new `CategoriesPanel`

**New component: `CategoriesPanel`**
- Tree view with add/edit/delete at each node
- Each node shows: name, color badge, and child count
- Leaf nodes show a "linked sub-event" indicator (auto-created)
- Add category button at each level of the tree
- When a leaf category is created, auto-create a matching sub_event with `name = full path` (e.g. "Solos > Male > 11-15")
- When a leaf category is deleted, cascade-delete its sub_event

### Hooks

**`useCompetitionCategories(levelId)`** — fetch categories for a level, structured as flat list (tree built in UI)
**`useCreateCategory`, `useDeleteCategory`, `useUpdateCategory`** — CRUD mutations that also manage the linked sub_event for leaf nodes

---

## Part 2: Category-Level Advancement

Advancement already works at the level/sub-event level. With categories:
- Each leaf category (= sub_event) advances its own top contestants to the matching category in the next level
- The `LevelAdvancementSettings` component gets a note: "With categories, advancement happens per category"
- The advancement logic in `useLevelAdvancement` will iterate leaf sub_events independently

No schema changes needed — advancement already copies registrations per sub_event.

---

## Part 3: Special Awards & Judge Voting

### Database Changes

**New table: `special_awards`**
- `id`, `competition_id` (FK), `name` (e.g. "Best Student Choreographer"), `description`, `sort_order`, `created_at`
- RLS: organizer/admin can CRUD; judges can SELECT

**New table: `special_award_votes`**
- `id`, `special_award_id` (FK), `judge_id` (FK to auth.users via user_id pattern), `contestant_registration_id` (FK), `sub_event_id` (FK), `created_at`
- UNIQUE(`special_award_id`, `judge_id`) — one vote per judge per award
- RLS: judges can INSERT/UPDATE their own; organizer/admin/tabulator can SELECT all

### UI Changes

**Competition Settings — new "Special Awards" section** (in CompetitionDetail tab or alongside Rubric)
- CRUD list for defining awards: name, description
- Preset suggestions: "Best Performing School", "Best Student Choreographer", "Most Disciplined School", "Best Costumed Group", "Best Overall Folk Dance", "Most Outstanding Dancer (Male)", "Most Outstanding Dancer (Female)", "Best Classical Dance", "Best Limbo Dance"

**Judge Scoring page — Final Round Awards card**
- When the level is marked as `is_final_round` and special awards exist, show an "Awards Voting" card
- For each award: dropdown/search to select a contestant from the level's registrations
- Saves to `special_award_votes`
- Judge can change their vote until scoring is certified

**Results / Master Sheet — Awards tab**
- Show vote tallies per award
- Display winner (most votes) for each award

### Hooks

**`useSpecialAwards(competitionId)`** — fetch awards
**`useSpecialAwardVotes(competitionId, subEventId)`** — fetch/upsert votes
**`useCreateSpecialAward`, `useDeleteSpecialAward`** — CRUD

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | New | `competition_categories`, `special_awards`, `special_award_votes` tables + `structure_type` column on levels |
| `src/hooks/useCompetitions.ts` | Update | Add category + special award hooks |
| `src/components/competition/LevelsManager.tsx` | Update | Add structure toggle, render CategoriesPanel when "categories" mode |
| `src/components/competition/CategoriesPanel.tsx` | New | Tree UI for managing category hierarchy |
| `src/components/competition/SpecialAwardsManager.tsx` | New | CRUD UI for defining special awards |
| `src/components/competition/SpecialAwardsVoting.tsx` | New | Judge voting card for final round awards |
| `src/pages/JudgeScoring.tsx` | Update | Show awards voting card when final round |
| `src/pages/LevelMasterSheet.tsx` | Update | Add awards results section |
| `src/pages/CompetitionDetail.tsx` | Update | Add Special Awards tab/section |

## Implementation Order

1. Database migration (categories table, special awards tables, structure_type column)
2. Category tree hooks + CategoriesPanel component
3. LevelsManager integration (structure toggle)
4. Special awards CRUD hooks + manager component
5. Judge voting card on scoring page
6. Awards results display on master sheet

