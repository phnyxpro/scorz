

## Plan: Reassign Kwame Weekes' Semi-Final Scores to Alette Liz Williams

### Summary of findings

- **Sub-event**: Semi-final (`fdd01847-405e-4827-a7f1-c5860ea41041`) for National Poetry Slam 2026
- **Kwame Weekes** has **18 judge scores** in this sub-event
- **Chief Judge certification** was made by Jean Claude Cournand (not Kwame), so no certification change is needed
- Both Kwame and Alette already have `sub_event_assignments` for this sub-event
- Alette's profile name is currently "alettelwilliams" — should be updated to "Alette Liz Williams"

### Steps

1. **Update 18 judge_scores**: Change `judge_id` from Kwame (`ace880a5-dcac-4049-a88b-9cf903c2b509`) to Alette (`ad92de5c-ffd0-4e96-8c1f-02114e26138d`) for all rows in the Semi-final sub-event.

2. **Update Alette's profile name**: Set `full_name` to "Alette Liz Williams" (currently "alettelwilliams").

3. **Optionally remove Kwame's sub_event_assignment** for the Semi-final since he didn't judge it.

### Technical details

All changes are data updates via the database insert/update tool:

```sql
-- 1. Reassign scores
UPDATE judge_scores
SET judge_id = 'ad92de5c-ffd0-4e96-8c1f-02114e26138d'
WHERE judge_id = 'ace880a5-dcac-4049-a88b-9cf903c2b509'
  AND sub_event_id = 'fdd01847-405e-4827-a7f1-c5860ea41041';

-- 2. Fix Alette's display name
UPDATE profiles
SET full_name = 'Alette Liz Williams'
WHERE user_id = 'ad92de5c-ffd0-4e96-8c1f-02114e26138d';

-- 3. Remove Kwame's assignment (optional)
DELETE FROM sub_event_assignments
WHERE user_id = 'ace880a5-dcac-4049-a88b-9cf903c2b509'
  AND sub_event_id = 'fdd01847-405e-4827-a7f1-c5860ea41041';
```

No code changes needed — this is purely a data correction.

