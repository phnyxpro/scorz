

## Plan: Add 5 Tobago Audition Contestants

### What
Insert 5 contestant registrations for the Tobago audition sub-event of National Poetry Slam 2026, with guardian details for the 4 minors.

### Target
- **Competition**: National Poetry Slam 2026 (`04b250a2-e4bc-4716-aa56-d0c9c4c3bc35`)
- **Sub-event**: Tobago Auditions (`ed535ad8-6122-42f4-8d27-9d6d62649c99`)
- **Owner user_id** (for on-behalf registrations): `b0b252c9-1dfe-473a-b1f4-b0906f36bc8d`

### Contestants to Insert

| # | Name | Email | Phone | Age | Guardian | Guardian Contact |
|---|------|-------|-------|-----|----------|-----------------|
| 1 | Taraji Davis | tarajidavis28@bhs.edu.tt | (868) 324-5157 | minor | Lisa Melville | 7999750 / lsmelville@gmail.com |
| 2 | Markus Wylie | debbieannwylie@gmail.com | (868) 778-8087 | minor | Debbie-Ann Thompson-Wylie | 8687788087 / debbieannwylie@gmail.com |
| 3 | Alessandro Babb | alessandrot.babb@gmail.com | (868) 477-7128 | minor | Atibah Babb | 8687625560 / atibah.babb@gmail.com |
| 4 | Sebastian Mc Kenna | sebastianmckenna9@gmail.com | (868) 379-2839 | minor | Nicholas Mc Kenna | 3641694 / mckennanicholas3@gmail.com |
| 5 | Camryn Bruno | cammib2@gmail.com | (868) 751-4451 | adult | — | — |

### Implementation
1. Create a temporary edge function (or use an existing one) that uses the service role key to bulk-insert all 5 records into `contestant_registrations` with:
   - `status: 'approved'` (on-behalf registration)
   - `rules_acknowledged: true`
   - `age_category: 'minor'` for the first 4, `'adult'` for Camryn
   - Guardian name, email, and phone populated for minors
   - `location: 'Audio Visual Room, Tobago Library Services'`
   - Sequential `sort_order` values
2. Verify the insertions via a read query
3. Delete the temporary edge function after use

