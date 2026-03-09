

## Plan: Reorder 61 Trinidad Contestants

### What
Update the `sort_order` column for all 61 approved contestants in the Trinidad sub-event (`14ae92f2-a730-4c72-9aa1-19b0e3561722`) to match the provided list. This order will also determine the sequence judges see when certifying scores.

### How
Execute a single batch of UPDATE statements against `contestant_registrations` using the data insert tool, setting `sort_order` from 1 to 61 for each contestant by their registration ID.

### Notable Adjustments
Some names in the current database differ slightly from the provided list and need case-insensitive matching:
- "akeem jack" → Akeem Jack (position 9)
- "Toshani Nath" → Toshani Nathi (position 40)
- "Winston Trotman" currently at position 26, needs to move to 26 (same)
- "Mckayla Alfred" at 25 → needs to move to 27

### ID-to-Position Mapping (all 61 records)
Each contestant's `sort_order` will be set to their 1-based position in the provided list. The full mapping is derived from the query results above. Key reorderings include moving contestants like Jayda Jackman (currently 37 → 57), Colleen Cleghorn (57 → 39), Marcus Hazel (39 → 36), Kevin Telemaque (30 → 37), and others.

### Implementation
One SQL UPDATE per contestant via the data insert tool — 61 updates total setting `sort_order` values 1 through 61.

