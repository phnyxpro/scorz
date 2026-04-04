

# Plan: Update SPARK Secondary Schools Registrations from CSV

## Overview
Delete all existing 46 registrations for SPARK Secondary Schools and re-import from the updated CSV (138 lines, ~55-60 entries after parsing multi-line rows). This is a data operation — no code changes needed.

## Steps

### 1. Parse the CSV and build registration records
Write a Python script that:
- Parses the CSV (handling multi-line quoted fields for Performers, Dance Synopsis, School Name, etc.)
- Maps each row to `contestant_registrations` columns and `custom_field_values` JSONB

**Column mapping (CSV → DB):**

| CSV Column | DB Column / custom_field_values key |
|---|---|
| Name of Applicant | `full_name` + `spark_applicant_name` |
| Applicant's Email | `email` + `spark_applicant_email` |
| Applicant's Phone Number | `phone` + `spark_applicant_phone` |
| School Name | `spark_school_name` |
| School's Phone Number | `spark_school_phone` |
| Level | `cf_1774993358212` → resolved to level UUID `3b8c9863-6938-432c-907e-2b0722e28e13` (Semifinal Round) |
| Category | `cf_1774990289937` (stored as text value: Solo/Duet/Group/Student Choreography) |
| Division | `cf_1774990296537` (stored as text: Female/Male/Mixed) |
| Age Group | `cf_1774990424221` (stored as text: 11-15/16-19/Mixed/Student Choreography) |
| Performers | `cf_1774990523520` (joined with comma-space) |
| Dance Class | `cf_1774990613141` → normalized to snake_case option value |
| Dance Style (conditional) | Appropriate `cf_177499*` field based on Dance Class |
| Dance Style raw | `cf_1774991076178` (display value) |
| Choreographer Name | `cf_1775002955538` |
| Dance Synopsis | `cf_1774991903558` |
| Links | `cf_1774992869708` (Link to Performance) |
| Consent | `spark_rules_consent` |

### 2. Delete existing registrations
Use a migration to delete all 46 current registrations for competition `3a212bca-40f7-481f-ab67-9ce5e5223eb5` (since DELETE requires migration/insert tool).

### 3. Insert new registrations
Insert all parsed rows using the insert tool with:
- `user_id`: `b0b252c9-1dfe-473a-b1f4-b0906f36bc8d` (existing organiser)
- `competition_id`: `3a212bca-40f7-481f-ab67-9ce5e5223eb5`
- `status`: `approved`
- `sort_order`: sequential (0, 1, 2, ...)
- All custom fields in `custom_field_values` JSONB

### 4. Fix build errors (separate)
Fix the TypeScript errors in edge functions (`e` is of type 'unknown') by adding type assertions in:
- `notify-registration-status/index.ts`
- `notify-scoring-events/index.ts`
- `notify-admin-activity/index.ts`
- `seed-demo-data/index.ts`
- `seed-demo-users/index.ts`
- `send-score-alert/index.ts`

## Dance Class → Option Value Mapping
- "Contemporary Dance" → `contemporary_dances`
- "Traditional Dance (as taught in...)" → `traditional_folk_dances`
- "Creative Dance" → `creative_dances`
- "Recreational/Social Dance" → `recreational/social_dances`
- "Carnival Character Dance" → `traditional_carnival_or_folklore_character_dances`
- "Classical Dance" → `classical_dances`
- "Student Choreography (Cultural form...)" → `student_choreography`
- "Folklore" / "Traditional Folklore Characters" → `traditional_carnival_or_folklore_character_dances`

## Dance Style → Conditional Field Mapping
Based on Dance Class, the Dance Style value goes into the corresponding conditional dropdown field. The raw display text also stored in `cf_1774991076178`.

## Result
All registrations will be replaced with the updated CSV data, properly mapped to form fields, with performance video links stored in `cf_1774992869708` (Link to Performance).

