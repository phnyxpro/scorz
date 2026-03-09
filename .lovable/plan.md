

## Two Changes

### 1. Fix CriterionSlider Decimal Input

The `<Input type="number">` on mobile devices often shows a numeric keypad without a decimal point. The fix is to add `inputMode="decimal"` to the input element so mobile keyboards show the decimal point. The underlying parsing logic (`handleNumberInput` with `parseFloat`) already handles decimals correctly — this is purely a mobile keyboard issue.

**File:** `src/components/scoring/CriterionSlider.tsx`
- Add `inputMode="decimal"` to the `<Input>` element (line 76-87)

### 2. Reset Score for Miguel Jagarnath (Patti-Anne Ali)

The existing score record `f230dff9-b329-430b-b45b-4a7c02eca77f` has **numeric index keys** (`"0"`, `"1"`, ...) in `criterion_scores` instead of UUID keys. This causes the score display to show blanks on all pages that were recently fixed to use UUID-based mapping.

The values themselves are correct (4.5, 4.5, 4.5, 4.5, 4.5, 5.0 = 27.5), so the fix is to UPDATE the `criterion_scores` JSONB to use UUID keys:

| Criterion | UUID | Value |
|---|---|---|
| Voice and Articulation | `b0dbb2db-...` | 4.5 |
| Stage Presence | `70c63092-...` | 4.5 |
| Dramatic Appropriateness | `9ca31e7d-...` | 4.5 |
| Literary Devices | `4fbe8675-...` | 4.5 |
| Use of Language | `2794170b-...` | 4.5 |
| Continuity (Storyline) | `e3a9397f-...` | 5.0 |

Raw total stays 27.5, final_score stays 27.5 (no time penalty).

**Action:** SQL UPDATE on judge_scores to replace the criterion_scores JSONB.

