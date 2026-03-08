
## Plan: Update Performance Durations for 5 Contestants

### What
Add performance durations for **5 contestants** in the **Trinidad** sub-event who were previously missing time recordings. All contestants performed under the 4-minute time limit, so no penalties will apply.

### Found Contestant Records
| Contestant | Registration ID | New Duration | Penalty Status |
|---|---|---|---|
| Cheyenne Calliste | `c18a6d97-97a4-4c27-9580-97be9423920c` | 233.10s (3:53.10) | No penalty |
| Jabari Lynch | `41ea1c51-894f-442d-82dc-abcb000ce6f0` | 224.15s (3:44.15) | No penalty |
| Jayda Jackman | `393156f7-fcbf-4e49-8a3e-a42700f5e6cf` | 137.06s (2:17.06) | No penalty |
| Demetri Stroude | `5490ab0c-b319-4b82-8dec-c825b545b30c` | 177.58s (2:57.58) | No penalty |
| Tehilla Jeffrey | `cea7c98b-e25e-46d8-8d1e-acbf9dd2e030` | 235.07s (3:55.07) | No penalty |

### Current Status
- All 5 contestants have **complete judge scores** (5 scores each)
- Currently have `time_penalty = 0` and no duration recorded
- Competition time limit: **240 seconds** (4:00) + 15s grace period
- No existing `performance_durations` records for these contestants

### Implementation
1. **Insert Duration Records**: Add 5 records to `performance_durations` table with the tabulator ID from `robinsonjeanluc`
2. **Update Judge Scores**: Set `performance_duration_seconds` field for all 25 judge score records (5 judges × 5 contestants)
3. **Verify Penalties**: Since all times are under 240s, `time_penalty` remains 0 and `final_score` stays unchanged

### Technical Details
- Sub-event ID: `14ae92f2-a730-4c72-9aa1-19b0e3561722` (Trinidad)
- Tabulator ID: `e5622288-b755-4f71-a126-c92f41db3ef5` (robinsonjeanluc)
- All times converted from MM:SS.cs format to decimal seconds
- Automatic timestamp handling (`created_at`/`updated_at`)
