

# Score Powered by PHNYX.DEV — Full MVP Plan

## Overview
A general-purpose competition management platform designed for live adjudicated events (poetry slams, talent shows, etc.). Features a dark "Auditorium Mode" UI, real-time scoring, multi-level certification, audience voting, and configurable rubrics.

---

## Phase 1: Foundation & Auth

### 1.1 Dark Theme UI Shell
- True dark theme (deep charcoal/black backgrounds) as default
- Theme toggle with **brightness and contrast sliders** using CSS filters — "Auditorium Mode"
- Muted accent colors (amber/teal) for interactive elements
- Mobile-first responsive layout

### 1.2 Authentication & Role System
- Supabase Auth with email/password signup and login
- Role-based access: **Admin, Organizer, Chief Judge, Judge, Tabulator, Witness, Contestant, Audience**
- Roles stored in a dedicated `user_roles` table with RLS security definer functions
- Profile table with name, contact info, avatar

---

## Phase 2: Competition Structure (Admin)

### 2.1 Competition Management
- Create/edit competitions with name, description, dates
- Define **Levels (Stages)**: e.g., Auditions → Semi-Finals → Finals
- Create **Sub-Events** under each level with location, date, time range

### 2.2 Rubric Builder
- Admin can define custom scoring criteria (name, description per score 1-5)
- Default template: Voice & Articulation, Stage Presence, Dramatic Appropriateness, Literary Devices, Use of Language, Continuity
- Each criterion has descriptive labels per score level (e.g., 1="Very Weak", 5="Excellent")

### 2.3 Penalty Rule Configuration
- Configurable time limit and grace period
- Penalty tiers: define time ranges and point deductions (e.g., 4:16-4:25 = -4pts, 4:38+ = -16pts)

### 2.4 User Assignment
- Assign judges, chief judge, tabulator, and witness to each sub-event
- Manage adjudication panels per sub-event

---

## Phase 3: Contestant Registration

### 3.1 Self-Service Registration Portal
- Public registration form: name, age category, location, contact, email
- Parent/guardian fields for under-18 contestants
- Profile photo upload, social handles, bio, performance video links

### 3.2 Rules Acknowledgment & Digital Signature
- Display competition rules, rubric, and penalty structure
- Mandatory checkboxes for each rule section
- **Canvas signature pad** — contestants draw their signature to certify compliance
- Email verification link sent upon registration
- Parental co-signature flow for minors

### 3.3 Scheduling
- Contestants can select available time slots at sub-events
- Admin can quick-add walk-in contestants

---

## Phase 4: Judge Scoring Interface

### 4.1 Performance Timer
- Large, low-glow start/stop timer
- Visual color changes: normal → yellow (grace period) → red (penalty zone)
- Auto-records duration to database

### 4.2 Scoring Card
- Six slider inputs (1-5) per criterion with dynamic rubric tooltips
- Real-time sub-total calculation
- Auto-calculated time penalty display
- General comments text area with **speech-to-text** (Web Speech API) microphone button

### 4.3 Score Privacy & Certification
- RLS ensures judges only see their own scores
- **Canvas digital signature** to certify each scorecard
- Once signed, scores are locked and immutable

---

## Phase 5: Chief Judge Dashboard

### 5.1 Real-Time Panel Monitor
- Grid showing each judge's completion status and signature status per contestant
- Color-coded: In Progress / Submitted / Certified
- Cannot view numerical scores until event is certified

### 5.2 Tie-Breaking Controls
- Toggle "Tie-Break Mode" when identical final scores exist
- Select priority rubric category to resolve ties
- Chief Judge's weighted score override option

### 5.3 Penalty Review
- Review auto-triggered time penalties
- Approve or adjust penalty applications

### 5.4 Final Certification
- Master digital signature to certify all results for a sub-event
- Results only published after Chief Judge sign-off

---

## Phase 6: Tabulator & Witness Verification

### 6.1 Tabulator Interface
- Side-by-side view: digital scores vs. physical record confirmation toggle
- Automated averaging: Final Score = Σ(Judge Totals) / Number of Judges − Penalties
- **Canvas digital signature** for tabulator certification

### 6.2 Witness Sign-Off
- Witness reviews the certification chain
- Canvas digital signature with timestamp
- Sub-event only "closed" when all three signatures collected (Tabulator + Witness + Chief Judge)

---

## Phase 7: Audience Voting — People's Choice

### 7.1 Voter Registration
- Mobile-friendly dark UI form: name, email, contact, seat/ticket number
- Ticket number used as unique key (one vote per attendee per sub-event)

### 7.2 Voting Interface
- Simple contestant selection with photo and name
- Confirmation screen before submission
- Vote locked after submission

### 7.3 Admin Tally View
- Real-time vote count visible only to Admin and Chief Judge
- Voter data audit (verify against attendee list)

---

## Phase 8: Results & Export

### 8.1 Results Dashboard
- Ranked contestant list with individual judge scores, averages, penalties, and final scores
- People's Choice winner display
- Certification status indicators

### 8.2 PDF Export
- Generate formatted results documents
- Include digital signature records and timestamps

---

## Phase 9: Organizer Overview

### 9.1 Event Dashboard
- Bird's-eye view of all sub-events, locations, schedules
- Contestant check-in status and performance order
- Live performance tracking (who's on stage, timer status)

### 9.2 Audit Trail
- Full log of all certifications, signatures, and score locks with timestamps
- Exportable compliance report

