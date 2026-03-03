

## Gap Analysis: Scorz Role Specification vs Current Implementation

### What's Already Built (Per Role)

**1. Admin (Platform Admin)**
- User/role management panel (`AdminPanel.tsx`) -- assign/revoke roles
- Missing: Instance management for organizers, global settings/billing, platform analytics, masquerade/support mode

**2. Organiser**
- Event architecture: Competitions, Levels, Sub-Events (fully built)
- Rubric builder with 1-5 scale and custom categories (built)
- Penalty engine with configurable tiers (built)
- User provisioning: Sub-event assignments for roles (built), staff invitations (built)
- Sponsors and Updates management (built)
- Banner uploads and social links (built)
- Missing: Contestant approval workflow (approve/reject registrations), performance order arrangement, walk-in contestant quick-add

**3. Chief Judge**
- Panel oversight dashboard with judge certification status (built)
- Tie-breaking engine with priority rubric category (built)
- Penalty review with adjustment capability (built)
- Master certification with digital signature (built)
- Score hiding until certified (enforced via RLS)
- Missing: Nothing critical -- this role is well-implemented

**4. Judge**
- Performance timer with start/stop (built)
- Interactive scorecard with 1-5 sliders showing rubric definitions (built)
- Speech-to-text comments via Web Speech API (built)
- Digital signature to certify and lock scorecard (built)
- Keyboard shortcuts for save (S) and certify (Enter) (built)
- Assigned sub-event filtering (built)
- Missing: Nothing critical -- this role is well-implemented

**5. Tabulator**
- Score summary table and side-by-side detail view (built)
- Physical/digital match confirmation toggle (built)
- Discrepancy notes (built)
- Digital signature certification (built)
- Certification chain enforcement (waits for Chief Judge) (built)
- Missing: Audience vote audit tools (flag/remove duplicate ticket numbers)

**6. Contestant**
- Multi-step registration with personal info, bio, guardian fields (built)
- Rules/rubric review step (built)
- Digital compliance signature (built)
- Sub-event scheduling/selection (built)
- Profile page with registrations list (built)
- Missing: Post-event score viewing portal (view own scores after certification), performance time slot booking (currently just sub-event selection)

**7. Audience**
- Voting form with name, email, phone, ticket number (built)
- One-vote-per-email enforcement (built)
- Live vote tally visualization (built)
- Missing: Live lineup view of performing order (separate from voting)

---

### Priority Gaps to Implement

Given the spec, here are the most impactful missing features, ordered by priority:

#### Phase 1: Organiser Contestant Management
1. **Registration approval workflow** -- Add approve/reject actions on contestant registrations in the competition detail page
2. **Performance order arrangement** -- Drag-and-drop or manual sort order for contestants within a sub-event
3. **Walk-in contestant quick-add** -- A streamlined form for organizers to register walk-in contestants on event day

#### Phase 2: Tabulator Vote Audit
4. **Audience vote audit tools** -- A tab in the Tabulator dashboard to view, flag, and remove duplicate/invalid votes by ticket number

#### Phase 3: Contestant Post-Event Portal
5. **Post-event score viewing** -- Allow contestants to view their own scores and judge feedback after the sub-event is fully certified

#### Phase 4: Admin Platform Features
6. **Platform analytics dashboard** -- High-level metrics (total competitions, users, active events)
7. **Organiser account provisioning** -- Admin can create organizer accounts

#### Phase 5: Public Audience Features
8. **Live performing lineup** -- Public-facing view of contestant order for a sub-event

---

### Technical Implementation Details

**Registration Approval (Phase 1)**
- Add a "Registrations" tab to `CompetitionDetail.tsx`
- Query `contestant_registrations` filtered by competition
- Add approve/reject buttons that update `status` field
- Add `sort_order` column to `contestant_registrations` via migration for performance ordering
- Create a quick-add dialog with minimal fields (name, email, age category) that auto-creates a user profile

**Vote Audit (Phase 2)**
- Add "Vote Audit" tab to `TabulatorDashboard.tsx`
- Query `audience_votes` for the selected sub-event
- Group by ticket number to detect duplicates
- Add delete capability for invalid votes (RLS already allows admin/organizer)

**Post-Event Scores (Phase 3)**
- Add a new RLS policy on `judge_scores` allowing contestants to view their own scores when the sub-event is fully certified
- Add a "My Scores" section to `ContestantProfile.tsx`

**Platform Analytics (Phase 4)**
- Add stats cards to `AdminPanel.tsx` showing total users, competitions, active events
- Query counts from `profiles`, `competitions`, `contestant_registrations`

**Live Lineup (Phase 5)**
- Add contestant lineup section to `PublicEventDetail.tsx`
- Query `contestant_registrations` with `status = 'approved'` for the selected sub-event, ordered by `sort_order`

