

## Rubric Builder Redesign

### Summary
Replace the existing `RubricBuilder` component with a full-featured matrix/grid builder that supports configurable scale definitions, criterion subtexts/guidelines, a visual grid editor, react-hook-form + zod validation, and responsive mobile layout using accordion stacking.

### Current State
- `RubricBuilder.tsx` exists with basic add/edit/delete criteria using individual Collapsible rows
- Data model: `rubric_criteria` table with fixed columns `description_1` through `description_5`
- The current DB schema is hardcoded to a 1-5 scale with separate `description_N` columns -- no flexible scale definition or subtext/guidelines field

### Database Changes
A migration to add two things:
1. **`rubric_scale_labels` JSONB column** on the `competitions` table -- stores the scale definition (min, max, labels per point). Default: `{"min":1,"max":5,"labels":{"1":"Very Weak","2":"Weak","3":"Average","4":"Good","5":"Excellent"}}`
2. **`guidelines` text column** on the `rubric_criteria` table -- stores the subtext/guidelines for each criterion (e.g., "-Range of voice. -Clarity of words")

No structural change to `description_1..5` columns needed since a 1-5 scale is already the default and the user's spec matches.

### Component Architecture

**File: `src/components/competition/RubricBuilder.tsx`** (full rewrite)

- **react-hook-form + zod** for the entire form:
  - Scale labels section: min/max range (locked to 1-5 for now given DB constraints), editable label per scale point (required)
  - Criteria array via `useFieldArray`: each with title (required), guidelines (optional), and `description_1..5` cells (required)
- **Desktop view**: Render a `<Table>` grid where rows = criteria, columns = scale points. Each cell is an `<Input>` or `<Textarea>` for the description. Column headers show the scale point number + label.
- **Mobile view** (using `useIsMobile`): Switch to an Accordion layout per criterion. Each accordion item shows the criterion title and expands to reveal a stacked card with all 5 scale point descriptions as labeled inputs.
- **Drag-to-reorder**: Use simple up/down arrow buttons for reordering criteria (keeps it simple without adding a DnD dependency).
- **"Save Rubric Schema" button**: Assembles the full JSON payload with scale definition + all criteria and `console.log`s it, plus persists to the database via existing mutation hooks.
- **"Load Default Template" button**: Pre-fills the form with the 6 default spoken word criteria.

### JSON Output Shape
```json
{
  "scale": {
    "min": 1,
    "max": 5,
    "labels": { "1": "Very Weak", "2": "Weak", "3": "Average", "4": "Good", "5": "Excellent" }
  },
  "criteria": [
    {
      "title": "Voice & Articulation",
      "guidelines": "-Range of voice. -Clarity of words (Diction)",
      "sort_order": 0,
      "descriptions": {
        "1": "Inaudible or unintelligible",
        "2": "Occasionally unclear",
        "3": "Generally clear",
        "4": "Clear and expressive",
        "5": "Exceptional vocal command"
      }
    }
  ]
}
```

### Files to Change
1. **DB migration** -- Add `rubric_scale_labels` JSONB to `competitions`, add `guidelines` text to `rubric_criteria`
2. **`src/hooks/useCompetitions.ts`** -- Update `RubricCriterion` interface to include `guidelines`, add hook for saving/reading scale labels from the competition record
3. **`src/components/competition/RubricBuilder.tsx`** -- Full rewrite with:
   - Scale label editor section
   - Grid/matrix table (desktop) with criteria rows x scale columns
   - Accordion layout (mobile) per criterion
   - react-hook-form + zod validation
   - Save button that logs JSON + persists to DB
4. **`src/pages/CompetitionDetail.tsx`** -- No change needed (already imports and renders `RubricBuilder`)

