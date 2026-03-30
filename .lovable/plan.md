

## Plan: Remove 8 Accidentally Promoted Registrations

### Problem
You accidentally triggered promotion from Auditions to Semi-final in the National Poetry Slam 2026 competition, creating 8 duplicate registrations in the Semi-final level.

### Solution
Run a single database migration to delete these 8 specific registration records by their IDs. These were all created at `2026-03-30 07:25:41-42` and are duplicates of contestants who already exist in the Semi-final.

### Records to Delete

| # | Name | ID |
|---|------|-----|
| 1 | Ronaldo Mohammed | `c8c02d89-ffbb-4b3b-8091-ce2b8f898f7a` |
| 2 | Shimiah Lewis | `4c6f46c9-4776-40ca-893d-5a252545ec64` |
| 3 | Renaldo Briggs | `9b5505a5-3f15-4950-af8b-9e6868da193d` |
| 4 | Jabari Collins | `89fc8cad-da61-447d-90ca-edf022b4854d` |
| 5 | Miguel Jagarnath | `c4487819-59fb-4985-b9c3-5d03d3282d2d` |
| 6 | Kyla Wilson | `cd69113c-64e0-4fea-9118-e3202d3fc0b6` |
| 7 | Winston Trotman | `c12404c6-6452-4276-9586-6987c73f4590` |
| 8 | Rickibah Isaac | `f7699435-f33a-4c49-b0e9-21df70306b41` |

### Technical Details
- Single SQL migration: `DELETE FROM contestant_registrations WHERE id IN (...)` targeting exactly these 8 IDs
- No associated judge_scores exist for these records (they all show 0.00 scores)
- The original Semi-final registrations for these contestants remain untouched

