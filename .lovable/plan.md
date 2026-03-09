

## Investigation: Missing Scores and Performance Times for Trinidad Sub-Event

### Current Context
- **Sub-event ID**: `14ae92f2-a730-4c72-9aa1-19b0e3561722` (Trinidad)
- **Total Approved Contestants**: 61
- **Assigned Judges**: 5 (Jean-Claude Cournand, Kwame Weekes, Mtmima Solwazi, Patti-Anne Ali, Shivanee Ramlochan)

### Investigation Plan

**Step 1: Query Current Data State**
- Fetch all 61 approved contestants for Trinidad sub-event
- Retrieve all existing `judge_scores` records
- Retrieve all existing `performance_durations` records

**Step 2: Identify Gaps**
- **Scores Analysis**: For each contestant, count how many judge scores exist (should be 5 per contestant)
- **Duration Analysis**: Check which contestants are missing performance duration records
- **Cross-reference**: Identify contestants with partial data (e.g., has duration but missing some judge scores)

**Step 3: Generate Missing Data Report**
Create a comprehensive table showing:
- Contestant name & registration ID
- Judge scores status (0-5 scores submitted)
- Performance duration status (recorded/missing)
- Action required (add scores, add duration, or both)

**Step 4: Prioritize Data Entry**
Categorize contestants by urgency:
1. **Critical**: Have scores but no duration (penalty calculation incomplete)
2. **High**: Missing all scores and duration
3. **Medium**: Missing only some judge scores (1-4 out of 5)

### Query Strategy
```sql
-- Get all contestants with score/duration counts
SELECT 
  cr.id,
  cr.full_name,
  cr.sort_order,
  COUNT(DISTINCT js.id) as score_count,
  COUNT(DISTINCT pd.id) as duration_count
FROM contestant_registrations cr
LEFT JOIN judge_scores js ON js.contestant_registration_id = cr.id
LEFT JOIN performance_durations pd ON pd.contestant_registration_id = cr.id
WHERE cr.sub_event_id = '14ae92f2-a730-4c72-9aa1-19b0e3561722'
  AND cr.status = 'approved'
GROUP BY cr.id, cr.full_name, cr.sort_order
ORDER BY cr.sort_order;
```

### Expected Deliverable
A detailed breakdown showing:
- Which contestants need performance durations added
- Which contestants need judge scores entered
- Summary statistics (e.g., "55 of 61 contestants have complete scoring")

This investigation will determine the scope of remaining data entry work needed before final certification.

