

# Rubric Customisation

## Overview
Enhance the rubric builder and scoring system to support: dynamic scale sizes, per-criterion point values, weight-vs-points toggle, category-specific bonus criteria, and rubric notes on score cards.

## Current State
- Scale is hardcoded to 5 points (1-5) with fixed `description_1` through `description_5` columns
- Weight is always shown as percentage
- All criteria apply globally to the competition
- No mechanism for category-specific or bonus criteria
- No rubric notes field on score cards

## Changes

### 1. Database Migration
**`rubric_criteria` table changes:**
- Add `scale_descriptions jsonb DEFAULT '{}'` — stores variable-length scale descriptions (replaces fixed `description_1`..`description_5` when scale size differs from 5)
- Add `point_values jsonb DEFAULT '{}'` — per-criterion custom point values for each scale level (e.g. `{"1": 2, "2": 4, "3": 6, "4": 8, "5": 10}`)
- Add `is_bonus boolean DEFAULT false` — marks criterion as a bonus/special criterion
- Add `applies_to_categories uuid[] DEFAULT '{}'` — array of `competition_categories.id` values this criterion applies to (empty = applies to all)
- Add `notes text` — additional notes shown under score cards

**`competitions` table changes:**
- Update `rubric_scale_labels` format to support dynamic min/max (already has `min`/`max` fields in the type but hardcoded to 1-5)
- Add `rubric_weight_mode text DEFAULT 'percent'` — `'percent'` or `'points'` to toggle display mode

### 2. RubricBuilder Updates (`src/components/competition/RubricBuilder.tsx`)
- **Dynamic scale size**: Replace hardcoded `SCALE_POINTS = [1,2,3,4,5]` with a configurable range. Add +/- buttons to add/remove scale levels (min 2, max 10). Scale labels section updates dynamically.
- **Per-criterion point values**: Add a toggle "Define custom points per criterion". When enabled, each scale cell gets an optional point value input alongside the description.
- **Weight mode toggle**: Add a switch above the criteria table to toggle between "% Weight" and "Points". In points mode, show total points per criterion instead of percentage, and the validator shows total points sum instead of 100% check.
- **Bonus / Category-specific criteria**: Add a checkbox "Bonus criterion" and a multi-select for categories (populated from `competition_categories`). When categories are selected, this criterion only appears for contestants in those categories.
- **Notes field**: Add a textarea per criterion for additional notes to display on score cards.

### 3. Scoring Interface Updates
- **`CriterionSlider.tsx`**: Read dynamic scale range from rubric config instead of hardcoded 1-5. Support custom point values when defined.
- **`JudgeScoring.tsx`**: Filter visible criteria based on the contestant's category assignment. Show bonus criteria only for matching categories. Display criterion notes below the slider.

### 4. Score Card Updates
- **`ScoreCard.tsx`**: Render criterion notes below each score row when present.
- **`PublicRubric.tsx`**: Support dynamic scale columns instead of hardcoded 5. Show point values when defined. Mark bonus criteria with a badge.

### 5. Type Updates
- Update `RubricCriterion` interface in `useCompetitions.ts` to include new fields
- Update `RubricScaleLabels` to track dynamic scale count

### Files Modified
| File | Change |
|------|--------|
| `supabase/migrations/...` | Add columns to `rubric_criteria` and `competitions` |
| `src/components/competition/RubricBuilder.tsx` | Dynamic scale, point values, weight toggle, bonus criteria, notes |
| `src/components/scoring/CriterionSlider.tsx` | Dynamic scale range, custom points, notes display |
| `src/pages/JudgeScoring.tsx` | Category-based criterion filtering |
| `src/components/shared/ScoreCard.tsx` | Show criterion notes |
| `src/components/public/PublicRubric.tsx` | Dynamic scale columns, point values, bonus badges |
| `src/hooks/useCompetitions.ts` | Update types and queries |

### Implementation Order
1. Database migration (new columns)
2. Update types in `useCompetitions.ts`
3. RubricBuilder — dynamic scale + weight toggle + bonus criteria + notes
4. CriterionSlider + JudgeScoring — dynamic scale and category filtering
5. ScoreCard + PublicRubric — display updates

