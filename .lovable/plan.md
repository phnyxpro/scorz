

## Service Package Section for About Page

Add a new "Service Package" section between the pricing cards and FAQ on `/about`, offering a full-service adjudication and production management package with a discovery meeting request form.

### What gets built

**1. Service Package Card** — A visually distinct section (below pricing, above FAQ) with:
- Badge: "Full-Service Package"
- Headline emphasizing end-to-end event management
- Two feature columns:
  - **Adjudication Management**: Judge recruitment/training, rubric design consultation, chief judge coordination, real-time scoring oversight, results certification
  - **Production Management**: Event setup on Scorz platform, contestant registration management, scheduling and slot coordination, branding and sponsor configuration, on-the-day technical support, post-event reporting and analytics
- "Custom Quote" pricing indicator (no fixed price)

**2. Discovery Meeting Form** — Inline form below the service features using react-hook-form + zod validation:
- Fields: Full Name, Email, Phone (optional), Organisation/Event Name, Event Type (dropdown: Pageant, Talent Show, Dance Competition, Speech/Debate, Other), Expected Number of Contestants (range select), Preferred Event Date(s) (text input), Event Location, Brief Description/Special Requirements (textarea)
- Submit button: "Request Discovery Meeting"
- On submit: sends data to a new `service_requests` database table and shows a success toast
- No auth required (public form)

**3. Database** — New `service_requests` table with RLS allowing public inserts and admin-only reads.

### Files changed

| File | Change |
|------|--------|
| New migration | Create `service_requests` table |
| `src/pages/About.tsx` | Add Service Package section with form between pricing and FAQ |

### Form validation (zod)
- name: required, max 100 chars
- email: required, valid email
- phone: optional, max 20 chars
- organisation: required, max 150 chars
- event_type: required enum
- expected_contestants: required
- preferred_date: optional, max 100 chars
- location: required, max 200 chars
- description: optional, max 2000 chars

