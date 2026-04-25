## Context (revised)

The two attached CSVs are **leaderboard exports**, not score-card exports. Each judge column (e.g., "Deboleena Paul = 76") is that judge's **already-averaged percentage score** for the contestant (the value the platform stores as `judge_scores.final_score`). The "Total" column = sum of judge values, "Final" = Olympic-averaged %.

Confirmed structural facts in the DB:

- **SPARK - Primary Schools** Grand Finale level already has all category sub-events including `Solo > Female > 5-8`, `Solo > Female > 9+`, `Group > Folk`, `Group > Creative`, `Duet > Mixed > 9+`, etc. **No new sub-events needed.**
- **SPARK - Secondary Schools** Semifinal Round currently has the umbrella sub-event `"Semifinal Round"` (id `39d50549…`) plus the per-category sub-events. All scores and registrations are mistakenly attached to the umbrella, hiding everything from the Tabulator dashboard.
- The Primary leaderboard CSV "Sub-Event" column matches existing sub-event names exactly, so mapping is mechanical.

User decisions captured:

- **Primary advancement**: every contestant in `Spark_2026_-_Results_-_Advancing_Primary_Schools.csv` advances to Grand Finale. Reuse the existing Grand Finale sub-events with matching names (effectively "Option A" — clean per-category structure already exists).
- **Secondary active scoring**: leave on Grand Finale (the Semifinal leaderboard data is being replayed from the certified CSV; Tabulators don't need to re-certify).
- **Score distribution**: NOT a per-criterion split. Instead, each judge's CSV value is the post-rubric `final_score`; we backfill `criterion_scores` so the weighted sum equals that value (see step 4 below).

---

## Plan

### 1. Fix Secondary Schools sub-event mapping (data fix, no schema change)

For SPARK - Secondary Schools Semifinal Round:

- For each row in `Spark_2026_-_Results_-_Advancing_Secondary_Schools.csv`, look up the contestant by name + CSV "Sub-Event" string (e.g., `"Solo > Male > 16-19"`).
- Find the matching sub-event id under the Semifinal Round level (e.g., `549a8f4c-a1d2-45e0-84ed-5466c82a8c10` for `Solo > Male > 16-19`).
- `UPDATE contestant_registrations SET sub_event_id = <correct_id> WHERE id = <reg_id>` for every contestant in the CSV that is currently pinned to the umbrella `"Semifinal Round"` sub-event.
- Delete any existing `judge_scores` rows for those contestants whose `sub_event_id` points at the umbrella so we can re-insert clean ones below.
- Leave the umbrella sub-event in place (no orphans) but it will end up empty for these contestants.

### 2. Wipe corrupted scores for both competitions

- `DELETE FROM judge_scores WHERE sub_event_id IN (<all SPARK Primary semifinal sub-event ids>)`
- `DELETE FROM judge_scores WHERE sub_event_id IN (<all SPARK Secondary semifinal sub-event ids including the umbrella>)`
- `DELETE FROM chief_judge_certifications` for the same sub-events so we can re-certify cleanly.

### 3. Identify judges from CSV headers

Parse the judge column headers in each CSV and resolve them to `auth.users.id` via `profiles.full_name`:

**Primary judges**: Deboleena Paul, Hana Delong, Hamid Rahman, Urslin Nelson (Head Judge), Delano Manganoo.
**Secondary judges**: Matthew McLean, Cleavand "Arlington" Serries, Brigette Wilson, Susan Mohip (Head Judge), Marcia Fergus.

If any judge profile is missing, surface an error and stop — do NOT silently skip. (We'll list any unmatched names back to you.)

### 4. Re-insert `judge_scores` from CSV per-judge values

For each (contestant, judge) cell value `V` in the CSV:

- The platform computes `raw_total` from `criterion_scores` weighted by `rubric_criteria.weight_percent`. Since weights sum to 100, populating every criterion with the **same value `V**` yields a weighted sum of `V`. That gives `raw_total = V` exactly, with no fractional rounding artefacts and without faking detail we don't have.
- Insert one `judge_scores` row per (contestant, judge) with:
  - `criterion_scores = { <each rubric_criterion_id>: V }` (Primary: 6 criteria, Secondary: 8 criteria — but only the 6 weighted "main" ones for Secondary; bonus `Limbo` and `Student Journal` will be set to `0` so they don't add weight; `Presentation` 5% is fine to mirror).
  - `raw_total = V`
  - `time_penalty = 0` (CSV "Penalty" column is 0 for all rows)
  - `final_score = V` (trigger will recompute as `raw_total - time_penalty = V`)
  - `comments = NULL`
  - `is_certified = true`, `signed_at = now()`, `judge_signature = '<judge full name>'` (matches how the platform persists certified scores).

This makes the existing leaderboard logic produce the exact same Total / Final / Rank as the CSV (verified: Olympic averaging on the per-judge `final_score` values reproduces the CSV "Final" column to 1 decimal).

### 5. Re-create chief judge certifications

For each Semifinal sub-event that now has scores, insert a `chief_judge_certifications` row with `is_certified = true`, `chief_judge_id = <Head Judge user id>` (Urslin Nelson for Primary, Susan Mohip for Secondary), `signed_at = now()`. This re-enables contestant-side score visibility (the RLS policy on `judge_scores` for contestants requires a certification row).

### 6. Advance all Primary contestants to Grand Finale

The Primary CSV lists the advancers (every row in the leaderboard table at the top of the file). For each:

- Look up the existing `contestant_registrations` row.
- Find the Grand Finale sub-event with the same category name (e.g., `Solo > Female > 9+` → `92af8372-03e0-40bf-8f7b-c8e395d0b7ec`).
- Insert a **new** `contestant_registrations` row that mirrors the original (same `user_id`, `full_name`, `email`, `phone`, `custom_field_values`, `status='approved'`) but with `sub_event_id` pointing to the Grand Finale sub-event and a fresh `id`. This preserves Semifinal records intact.
- Note: rows where the same contestant appears multiple times in the CSV (e.g., "Shanyce Bethel" rows 2 + 3 in `Solo > Female > 5-8`) advance once per CSV row — the rank-3 line is a separate competing contestant whose name was mis-attributed to the school account; keeping them as separate registrations preserves that exact leaderboard.

### 7. Switch Primary `active_scoring_*`

- `UPDATE competitions SET active_scoring_level_id = <Grand Finale level id>, active_scoring_sub_event_id = NULL WHERE id = '969015b6-…'` so judges & tabulators see Grand Finale contestants in the dashboard for fresh scoring.
- Secondary stays on Grand Finale (already set there per your instruction).

### 8. Verification queries (run after the migration)

- `SELECT sub_event_id, count(*) FROM judge_scores js JOIN sub_events se ON se.id=js.sub_event_id … GROUP BY 1` per competition to confirm distribution.
- For 3 sample contestants per competition: recompute Olympic average from the inserted `final_score` rows and confirm it matches the CSV "Final" column to 1 decimal.
- Confirm Tabulator Dashboard tabs now show contestants per category (no more "empty" tabs).
- Confirm Leaderboard Total / Final / Rank match the CSV exactly.

---

## Risks & notes

- **Bonus criteria for Secondary** (`Limbo` 5% + `Student Journal` 5%): the CSV doesn't break these out, so we'll set them to `0` for every judge. That means total weighted contribution = 90% of `V`, not 100% — which would shift `raw_total` to `0.9 * V`. To avoid that drift, we'll set each non-bonus criterion to `V` (so the 90% weighted main criteria sum to `V` and bonuses contribute 0). **This requires confirming `is_bonus` columns exist on those two criteria** — I'll verify before writing the migration; if they're not flagged bonus, I'll instead distribute `V` across all 8 criteria proportional to weight (still produces `raw_total = V`).  
  
The bonus criterion brings the scoring to 105% if added. It doesn't decrease the points weighting.  

- All inserts will be wrapped in a single transaction per competition so a partial failure rolls back.
- No schema changes — purely data inserts/updates against existing tables.
- No code edits needed; the leaderboard, tabulator dashboard, and judge dashboard already render correctly once the data is right.