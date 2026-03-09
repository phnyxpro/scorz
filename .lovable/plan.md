

## Plan: Re-link Audition Scores to Restored Registration IDs

### Root Cause

When the original promotion **moved** contestants (updated their `sub_event_id` from Auditions to Semi-finals), the `judge_scores.contestant_registration_id` continued pointing to those same registration rows. When we later restored the contestants by creating **new** Auditions registration rows, the scores remained orphaned — linked to the Semi-final registration IDs while having `sub_event_id` pointing to Auditions sub-events.

Current state for each of the 15 contestants:
- **Semi-final reg ID** (e.g. `b32f8b57`): has 5 scores, scores' `sub_event_id` = Auditions sub-event
- **Auditions reg ID** (e.g. `078e698b`): has 0 scores

### Data Fix

Update `judge_scores.contestant_registration_id` for each of the 15 contestants, changing it from the Semi-final registration ID to the Auditions registration ID. The `sub_event_id` on the scores already correctly points to Auditions, so only the foreign key needs remapping.

This is a single SQL UPDATE joining on `email` + matching sub-event:

```sql
UPDATE judge_scores js
SET contestant_registration_id = aud.id
FROM contestant_registrations semi, contestant_registrations aud
JOIN sub_events se ON se.id = aud.sub_event_id
JOIN competition_levels cl ON cl.id = se.level_id AND cl.name ILIKE '%audition%'
WHERE js.contestant_registration_id = semi.id
  AND semi.sub_event_id = 'fdd01847-405e-4827-a7f1-c5860ea41041'  -- Semi-finals sub-event
  AND aud.email = semi.email
  AND aud.competition_id = semi.competition_id
  AND js.sub_event_id = aud.sub_event_id  -- scores' sub_event matches auditions
```

This reassigns all 75 score rows (15 contestants × 5 judges) to the correct Auditions registration IDs. No code or schema changes needed — purely a data correction.

### Verification

After the fix, each Auditions registration should show 5 scores, and the Level Master Sheet for Auditions will display the correct scores again.

