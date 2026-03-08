

## Plan: Import 5 Judge Score Sheets into NPS 2026 — Trinidad

### Context
There are already 203 scores in the Trinidad sub-event across all 5 judges. This import will **update existing scores** for contestants these judges already scored, and **insert new scores** for any missing rows.

### Data Mapping

**Sub-event:** `14ae92f2-a730-4c72-9aa1-19b0e3561722` (Trinidad)

**Judges matched from filenames:**
| CSV File | Judge | user_id |
|---|---|---|
| Patti-Anne Ali | pattianneali | `0b8a3d03-...` |
| Mtmima Solwazi | msolwazi.rootsfoundation | `d9d254f4-...` |
| Shivanee Ramlochan | Shivanee Ramlochan | `fb0b87cb-...` |
| Kwame Weekes | kwameweekesbookings | `ace880a5-...` |
| Jean-Claude Cournand | jeanclaude.cournand | `1254e40d-...` |

**Criteria mapping (sort_order keys for `criterion_scores` JSONB):**
- `"0"` = Voice and Articulation
- `"1"` = Stage Presence
- `"2"` = Dramatic Appropriateness
- `"3"` = Literary Devices
- `"4"` = Use of Language
- `"5"` = Continuity (Storyline)

### Data Issues Detected
1. **Patti-Anne Ali** — Miguel Jagarnath's "Voice and Articulation" value is `"4,5"` (comma decimal) → will be parsed as **4.5**
2. **Shivanee Ramlochan** — Extra trailing column after Total (running cumulative totals, will be ignored). Jabari Collins has an empty Continuity score → will use only the 5 scored criteria
3. All contestant names match registered contestants exactly (verified against the database)

### Implementation
A single **database migration** containing SQL `INSERT ... ON CONFLICT`-style upserts for all ~108 score rows across the 5 judges:

- For each row: build `criterion_scores` JSONB (`{"0": 4.5, "1": 3.5, ...}`), compute `raw_total` as sum of criteria values
- Use a check-and-update pattern: delete existing row for same `(judge_id, sub_event_id, contestant_registration_id)` then insert, since there's no unique constraint — wrapped in a transaction
- All scores inserted with `is_certified = false` (default)

**No code file changes needed** — this is a pure data migration.

