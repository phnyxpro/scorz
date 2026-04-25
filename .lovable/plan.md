## Goal
Advance all contestants listed in `Spark_2026_-_Results_-_Advancing_Secondary_Schools-2.csv` from the **Semifinal Round** to the **Grand Finale** in SPARK – Secondary Schools (`3a212bca-40f7-481f-ab67-9ce5e5223eb5`).

## Source data summary (38 advancing entries)
| Sub-Event Category | Count |
|---|---|
| Solo > Male > 16-19 | 1 |
| Solo > Male > 11-15 | 2 |
| Solo > Female > 16-19 | 6 |
| Solo > Female > 11-15 | 5 |
| Duet > Female > 16-19 | 3 |
| Duet > Female > 11-15 | 4 |
| Group > Folk | 7 |
| Group > General | 3 |
| Group > Creative | 5 |
| Student Choreography (CSEC) | 4* |

*Note: CSV shows 4 CSEC entries but only 3 lines visible (113-115 + 1 more). Will verify final count during import.

## Approach
For each entry in the CSV, look up the existing Semifinal registration (matched by applicant email/full name + the Semifinal sub-event derived from the CSV's "Sub-Event" path) and **insert a copy** into the corresponding Grand Finale sub-event with:

- Same `full_name`, `email`, `phone`, `bio`, `social_handles`, `profile_photo_url`, `performance_video_url`, `user_id`, `age_category`, `special_entry_type`.
- `competition_id` = `3a212bca-40f7-481f-ab67-9ce5e5223eb5`
- `sub_event_id` = the Grand Finale sub-event matching the CSV path (e.g. `Solo > Male > 16-19` → `5cd880c2-6a02-4b60-b22c-ccdf070856af`)
- `status` = `approved`
- `custom_field_values` = copied from the Semifinal record but with the **level field** (`cf_1774993358212`) updated to the Grand Finale level id `80f4be19-9955-456b-89e5-75ec6be50b69` and category hierarchy fields (`cf_1774990289937`, `cf_1774990296537`, `cf_1774990424221`) re-mapped to the matching Grand Finale category UUIDs (Solo/Duet/Group, Male/Female/Mixed, 11-15/16-19, Folk/General/Creative).
- `sort_order` continues from the current max for each Grand Finale sub-event.

## Sub-event ID mapping (Grand Finale)
- Solo > Male > 11-15 → `3ac82e90-e24f-432b-bb5d-2f1cb8139d1b`
- Solo > Male > 16-19 → `5cd880c2-6a02-4b60-b22c-ccdf070856af`
- Solo > Female > 11-15 → `66aa1650-b255-459e-8895-26196c82a0a6`
- Solo > Female > 16-19 → `084b6a64-bcc7-40a7-b3c5-75e0ef97d345`
- Duet > Female > 11-15 → `4a7a60d0-9c74-4c12-84ef-d9725c67a586`
- Duet > Female > 16-19 → `8254f341-4ce7-4a9a-a6d3-68784f0d4428`
- Group > Folk → `8b5b0735-b1b7-456f-bea9-2494ff6cd9b4`
- Group > General → `5247a1cf-c8f9-415c-8e42-b8b803ec5ac1`
- Group > Creative → `7e9a7b72-a990-4518-af5c-a0c582b90c2a`
- Student Choreography (CSEC) → `e5fe0016-b88d-4f2c-8cab-37de0e7aba9f`

## Steps
1. Look up each CSV row's existing Semifinal registration in the database (match by applicant email + dance synopsis/video link as a tiebreaker if duplicates exist for the same applicant in the same category).
2. Build a single `INSERT … SELECT`-style migration that inserts copies of those 38 records into the Grand Finale sub-events with the field overrides described above.
3. Run via a Supabase migration.
4. Verify counts per Grand Finale sub-event after insert.

## Out of scope
- Not deleting Semifinal records (advancement is a copy, consistent with `usePromoteContestants`).
- Not copying scores — judging starts fresh in the Grand Finale.
- Not changing the existing typecheck error in `RichTextEditor.tsx` (pre-existing, unrelated).
