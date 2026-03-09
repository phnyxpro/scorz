

## Investigation: Identify Missing Judge Scores for 3 Contestants

### What We Need to Find
For the Trinidad sub-event (`14ae92f2-a730-4c72-9aa1-19b0e3561722`), identify which of the 5 assigned judges have not yet submitted scores for:
- Ishmael Campbell (4/5 scores)
- Khyndeh Pantor (3/5 scores)
- Jael Reyes (4/5 scores)

### Query Strategy

**Step 1: Get Contestant Registration IDs**
```sql
SELECT id, full_name 
FROM contestant_registrations 
WHERE sub_event_id = '14ae92f2-a730-4c72-9aa1-19b0e3561722'
  AND full_name IN ('Ishmael Campbell', 'Khyndeh Pantor', 'Jael Reyes')
  AND status = 'approved';
```

**Step 2: Get All Assigned Judges**
```sql
SELECT user_id, is_chief
FROM sub_event_assignments
WHERE sub_event_id = '14ae92f2-a730-4c72-9aa1-19b0e3561722'
  AND role = 'judge';
```

**Step 3: Get Existing Scores**
For each contestant, retrieve which judges have already submitted scores:
```sql
SELECT contestant_registration_id, judge_id
FROM judge_scores
WHERE sub_event_id = '14ae92f2-a730-4c72-9aa1-19b0e3561722'
  AND contestant_registration_id IN (<contestant_ids>);
```

**Step 4: Cross-Reference**
Compare the list of assigned judges against submitted scores to identify gaps for each contestant.

**Step 5: Map Judge IDs to Names**
```sql
SELECT user_id, full_name
FROM profiles
WHERE user_id IN (<judge_user_ids>);
```

### Expected Output
A detailed breakdown showing:
- **Ishmael Campbell**: Missing 1 score from [Judge Name]
- **Khyndeh Pantor**: Missing 2 scores from [Judge Name 1], [Judge Name 2]
- **Jael Reyes**: Missing 1 score from [Judge Name]

This will pinpoint exactly which judges need to complete their evaluations for these 3 contestants.

