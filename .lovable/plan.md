

## Plan: Seed FCNPS 2025 with Complete Role & Event Data

### Current State

The competition already has solid seed data:
- 3 Levels (Preliminary, Semi-Finals, Grand Finals) with 4 Sub-Events
- 8 approved contestants with bios and locations
- 5 rubric criteria (Content, Performance, Vocal, Engagement, Emotional Impact)
- 3 penalty rules (time-based deductions)
- 1 sponsor (PHNYXPRO)
- 1 news update
- 3 real users with roles: admin, organizer, chief_judge

### What's Missing

- **Judge profiles and role assignments** -- no judges exist yet
- **Tabulator and Witness profiles and roles** -- none exist
- **Sub-event assignments** -- judges/chief judge/tabulator/witness not assigned to any sub-events
- **Additional news updates** -- only 1 test update exists
- **Social media links** -- currently empty
- **Additional sponsors** -- only 1 exists
- **Voting toggle** -- currently off (will enable it)
- **Rules URL** -- currently null

### Seed Data to Insert

#### 1. Create Fake Profiles for Judges, Tabulator, Witness (6 new profiles)

Insert profiles for 4 judges, 1 tabulator, and 1 witness using deterministic UUIDs:
- Judge 1: "Dr. Amara Okafor" (j1000000-...)
- Judge 2: "Professor James Liu" (j2000000-...)
- Judge 3: "Natasha Petrov" (j3000000-...)
- Judge 4: "Carlos Mendez" (j4000000-...)
- Tabulator: "Priya Sharma" (j5000000-...)
- Witness: "Rev. David Osei" (j6000000-...)

#### 2. Assign Roles via user_roles Table

Give each new profile their corresponding app_role (judge, tabulator, witness).

#### 3. Create Sub-Event Assignments

Assign judges, chief judge, tabulator, and witness to each sub-event so they show up on the public page and in dashboards:
- Prelim Heat A: 2 judges + chief judge + tabulator + witness
- Prelim Heat B: 2 judges + chief judge + tabulator + witness
- Semi-Final: 3 judges + chief judge + tabulator + witness
- Grand Final: all 4 judges + chief judge + tabulator + witness

#### 4. Update Competition Metadata

- Set `social_links` with Facebook, Instagram, X (Twitter), YouTube
- Set `rules_url` to a placeholder handbook URL
- Enable `voting_enabled = true`

#### 5. Add More News Updates (3 additional)

- "Registration Now Open" -- announcing the event
- "Judges Panel Announced" -- introducing the judges
- "Schedule Released" -- announcing the 3-day format

#### 6. Add More Sponsors (2 additional)

Using placeholder logo URLs for "National Arts Council" and "WordSmith Publishing"

### Technical Approach

All data will be inserted using the Supabase insert/update tool (not migrations, since this is data, not schema). The inserts will be executed in dependency order:
1. Profiles first (needed for foreign keys)
2. User roles (references user_ids from profiles)
3. Sub-event assignments (references user_ids and sub_event_ids)
4. Competition updates (references competition_id and admin user_id)
5. Competition metadata update (social links, rules URL, voting toggle)

No code changes are needed -- this is purely database seeding.

