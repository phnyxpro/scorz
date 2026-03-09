

## Plan: Add Performance Durations and Judge Scores for 6 Contestants

### Overview
Update performance times for 6 contestants in the **Trinidad** sub-event. Five contestants already have complete judge scores, but **Jabari Collins** is missing all 5 judge scores that need to be manually entered from physical score sheets.

### Contestants & Time Analysis

| Contestant | Registration ID | Duration | Seconds | Penalty Status |
|---|---|---|---|
| Jabari Collins | `c87a49f4-be32-4af2-ad2f-5aaa0f86824b` | 2:50.45 | 170.45s | ✓ No penalty (under 240s) |
| Abdul Majeed Abdal Karim | `98776d39-bbc1-43e1-a693-bd7fe36a6437` | 4:00.73 | 240.73s | ✓ No penalty (within grace period ≤255s) |
| Alexandra Stewart | `b32f8b57-b4b6-47f9-b03f-2595f07708f5` | 4:16.7 | 256.7s | ⚠️ **4 point penalty** (256-265s range) |
| Renessa John | `1d34d5bc-d0d9-46ea-a95a-9200eac83a1e` | 4:10.7 | 250.7s | ✓ No penalty (within grace period) |
| Fédon Honoré | `089a1912-071c-4205-a2a6-0b224b14aea1` | 4:15.03 | 255.03s | ✓ No penalty (within grace period) |
| Daejanique Holder | `526c3159-e549-4b78-a7fb-8dbf85ff5762` | 3:09.35 | 189.35s | ✓ No penalty (under 240s) |

**Penalty Structure:**
- Time limit: 240s (4:00)
- Grace period: 241-255s (no penalty)
- 256-265s: 4 point penalty
- 266-278s: 8 point penalty  
- 279s+: 16 point penalty

---

### Jabari Collins - Judge Scores Extraction

**Rubric Criteria:**
1. Voice and Articulation
2. Stage Presence
3. Dramatic Appropriateness
4. Literary Devices
5. Use of Language
6. Continuity (Storyline)

**Judge Scores from Uploaded Sheets:**

| Judge | Judge ID | Criterion Scores | Raw Total |
|---|---|---|---|
| Jean-Claude Cournand (Chief) | `jeanclaude.cournand` | 5, 5, 5, 4.5, 4, 4.5 | **28.0** |
| Kwame Weekes | `kwameweekesbookings` | 3.5, 5, 4.5, 4, 4, 4.5 | **25.5** |
| Mtmima Solwazi | `msolwazi.rootsfoundation` | 4, 4, 4.5, 4.5, 4, 5 | **26.0** |
| Patti-Anne Ali | `pattianneali` | 4, 4.5, 4.5, 4.5, 4.5, 4 | **26.0** |
| Shivanee Ramlochan | `shivanee.ramlochan` | 4, 5, 5, 4, 3.5, 3.5 | **25.0** |

**Note:** Shivanee Ramlochan's sheet shows an incomplete total column, but the individual criterion scores sum to 25.0.

---

### Current Scoring Status

**Complete Scores (5 judges each):**
- Abdul Majeed Abdal Karim ✓
- Alexandra Stewart ✓
- Renessa John ✓
- Fédon Honoré ✓
- Daejanique Holder ✓

**Missing Scores:**
- **Jabari Collins**: 0 scores → Will insert 5 new judge score records

---

### Implementation Steps

**1. Add Performance Durations (6 records)**
- Insert into `performance_durations` table
- Use tabulator ID: `e5622288-b755-4f71-a126-c92f41db3ef5` (robinsonjeanluc)
- Sub-event ID: `14ae92f2-a730-4c72-9aa1-19b0e3561722`

**2. Update Existing Judge Scores (25 records)**
- Set `performance_duration_seconds` for 5 contestants who already have scores
- Update `time_penalty` for Alexandra Stewart (4 points)
- Recalculate `final_score` for Alexandra Stewart only

**3. Insert Jabari Collins Judge Scores (5 new records)**
- Map criterion scores using rubric indices (0-5 based on sort_order)
- Set `performance_duration_seconds = 170.45`
- Set `time_penalty = 0` (under time limit)
- Set `final_score = raw_total` (no penalty)
- Set `is_certified = false` (judges need to certify)

**Judge Score Records Structure:**
```json
{
  "sub_event_id": "14ae92f2-a730-4c72-9aa1-19b0e3561722",
  "contestant_registration_id": "c87a49f4-be32-4af2-ad2f-5aaa0f86824b",
  "judge_id": "<judge_user_id>",
  "criterion_scores": {
    "0": 5.0,
    "1": 5.0,
    "2": 5.0,
    "3": 4.5,
    "4": 4.0,
    "5": 4.5
  },
  "raw_total": 28.0,
  "time_penalty": 0,
  "final_score": 28.0,
  "performance_duration_seconds": 170.45,
  "is_certified": false
}
```

---

### Alexandra Stewart Penalty Calculation
Alexandra Stewart exceeded the grace period (256.7s) and falls into the first penalty tier:
- Current scores will have `time_penalty` updated from 0 to 4
- `final_score` will be recalculated as: `raw_total - 4`
- All 5 of her judge score records need this update

---

### Technical Details
- Competition ID: `04b250a2-e4bc-4716-aa56-d0c9c4c3bc35`
- Sub-event ID: `14ae92f2-a730-4c72-9aa1-19b0e3561722` (Trinidad)
- Tabulator ID: `e5622288-b755-4f71-a126-c92f41db3ef5` (robinsonjeanluc)
- All criterion scores mapped using zero-indexed keys matching rubric sort_order
- Automatic timestamp handling (`created_at`/`updated_at`)

