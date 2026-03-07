export const helpCategories = [
    { slug: "getting-started", label: "Getting Started", description: "Learn the basics of the Scorz platform", icon: "Rocket" },
    { slug: "organiser", label: "Organiser", description: "Create and manage competitions end-to-end", icon: "Trophy" },
    { slug: "judge", label: "Judge", description: "Score performances and certify scorecards", icon: "ClipboardList" },
    { slug: "tabulator", label: "Tabulator", description: "Time performances, verify scores and certify results", icon: "BarChart3" },
    { slug: "contestant", label: "Contestant", description: "Register, build your profile and view feedback", icon: "User" },
    { slug: "audience", label: "Audience", description: "Browse events, buy tickets and vote", icon: "Users" },
];
export const helpArticles = [
    // ── Getting Started ───────────────────────────────
    {
        slug: "platform-overview",
        title: "Platform Overview",
        category: "Getting Started",
        categorySlug: "getting-started",
        order: 1,
        video: "",
        excerpt: "A high-level tour of Scorz and what it can do for your competitions.",
        content: `
## What is Scorz?

Scorz is a full-featured competition management platform built for pageants, talent shows, speech contests, and any judged event. It covers **every stage** of a competition — from registration through to certified results.

![Scorz dashboard overview](/help-images/getting-started/platform-overview.png)

### Core Capabilities

| Area | What it does |
|------|-------------|
| **Event Management** | Create competitions with levels, sub-events, rubrics and penalty rules |
| **Registration** | Contestants register online with profiles, photos and digital signatures |
| **Judging** | Judges score on customisable rubrics with real-time sliders |
| **Tabulation** | Tabulators time performances, verify scores and certify results |
| **Audience Engagement** | People's Choice voting, ticketing and news updates |
| **Results & Analytics** | Master score sheets, printable scorecards and advanced analytics |

### Who Uses Scorz?

- **Organisers** — set up the event, invite staff, manage registrations
- **Judges** — score contestants on rubric criteria
- **Chief Judges** — oversee judging panels, apply penalties, certify
- **Tabulators** — run timers, verify digital vs physical scores, publish results
- **Contestants** — register, manage profiles, receive feedback
- **Audience** — browse public events, buy tickets, vote

> **Tip:** You can hold multiple roles on the same account. Your dashboard adapts to show only the cards relevant to your active roles.
`,
    },
    {
        slug: "creating-an-account",
        title: "Creating an Account",
        category: "Getting Started",
        categorySlug: "getting-started",
        order: 2,
        video: "",
        excerpt: "Sign up with email, verify, and access the platform in under a minute.",
        content: `
## Step 1 — Navigate to Sign Up

Click **Get Started** on the landing page or go directly to the authentication screen.

![Sign up screen](/help-images/getting-started/sign-up.png)

## Step 2 — Enter Your Details

Fill in your **email address** and choose a **strong password**. You can also provide your full name and phone number.

## Step 3 — Verify Your Email

Check your inbox for a confirmation email and click the verification link. Once verified, you'll be redirected to your dashboard.

![Email verification](/help-images/getting-started/verify-email.png)

> **Note:** You must verify your email before you can sign in. If you don't see the email, check your spam folder.

## Step 4 — Complete Your Profile

After your first sign-in, navigate to **Settings** to upload a profile photo, update your display name and configure notification preferences.
`,
    },
    {
        slug: "choosing-your-role",
        title: "Choosing Your Role",
        category: "Getting Started",
        categorySlug: "getting-started",
        order: 3,
        video: "",
        excerpt: "Understand the different roles and how your dashboard adapts.",
        content: `
## Roles on Scorz

When you first sign up, you have the **audience** role by default. Organisers and admins can assign additional roles to your account.

### Available Roles

- **Organiser** — Full control over competitions you create
- **Judge** — Score contestants assigned to your sub-events
- **Chief Judge** — Oversee a judging panel with penalty and certification powers
- **Tabulator** — Time performances, verify scores, certify results
- **Contestant** — Register for competitions and manage your profile
- **Audience** — Browse events, purchase tickets, cast People's Choice votes
- **Admin** — Platform-wide administrative access

![Role selection](/help-images/getting-started/roles.png)

### How Roles Affect Your Dashboard

Your dashboard cards automatically adjust based on your roles. A user with both **organiser** and **judge** roles will see event management cards alongside judging cards.

> **Tip:** You can hold multiple roles simultaneously — there's no need to create separate accounts.
`,
    },
    // ── Organiser ─────────────────────────────────────
    {
        slug: "creating-a-competition",
        title: "Creating a Competition",
        category: "Organiser",
        categorySlug: "organiser",
        order: 1,
        video: "",
        excerpt: "Set up a new competition with levels, sub-events and branding.",
        content: `
## Step 1 — Open the Events Page

Navigate to **Events** from your dashboard or sidebar. Click **Create Competition**.

![Create competition button](/help-images/organiser/create-comp-step1.png)

## Step 2 — Fill in Event Details

Provide a **name**, optional description, start/end dates and upload a banner image.

## Step 3 — Add Levels & Sub-Events

Competitions are organised into **Levels** (e.g. "Junior", "Senior") and each level contains **Sub-Events** (e.g. "Evening Gown", "Talent").

![Levels and sub-events](/help-images/organiser/levels-sub-events.png)

## Step 4 — Configure Branding

Upload your competition logo, set primary and accent colours, and choose a font to match your brand identity.

## Step 5 — Set Scoring Method

Choose between **average**, **trimmed mean**, **sum** or **weighted** scoring methods for your competition.

> **Tip:** You can change the scoring method at any time before results are certified.
`,
    },
    {
        slug: "managing-registrations",
        title: "Managing Registrations",
        category: "Organiser",
        categorySlug: "organiser",
        order: 2,
        video: "",
        excerpt: "Review, approve or reject contestant registration applications.",
        content: `
## Accessing Registrations

Go to **Registrations** from your dashboard. You'll see a filterable table of all registration submissions.

![Registrations hub](/help-images/organiser/registrations.png)

## Reviewing Applications

Click on any registration to view the full application including:
- Profile photo and bio
- Age category and location
- Digital signature and rules acknowledgement
- Guardian details (for minors)

## Approving or Rejecting

Use the status dropdown to change a registration from **pending** to **approved** or **rejected**. Approved contestants appear in the competition's contestant list.

## Assigning to Sub-Events

Once approved, assign contestants to specific sub-events using the dropdown selector on each registration row.

> **Tip:** Use the search and filter controls to quickly find registrations by name, status or sub-event.
`,
    },
    {
        slug: "building-rubrics",
        title: "Building Rubrics",
        category: "Organiser",
        categorySlug: "organiser",
        order: 3,
        video: "",
        excerpt: "Define scoring criteria with weights, descriptions and scale labels.",
        content: `
## What is a Rubric?

A rubric defines the **criteria** judges use to score contestants. Each criterion has a name, weight percentage, and descriptions for each score level (1–5).

![Rubric builder](/help-images/organiser/rubric-builder.png)

## Creating Criteria

1. Navigate to your competition → **Rubric** tab
2. Click **Add Criterion**
3. Fill in the criterion name (e.g. "Stage Presence")
4. Set the **weight percentage** (all criteria must total 100%)
5. Write descriptions for each score level (1 = Poor, 5 = Excellent)

## Reordering Criteria

Drag and drop criteria to change their display order on the judge's scoring interface.

## Scale Labels

Customise the labels for each point on the 1–5 scale (e.g. "Needs Improvement", "Developing", "Competent", "Proficient", "Outstanding").

> **Tip:** Keep descriptions concise but specific — judges rely on them to make consistent scoring decisions.
`,
    },
    {
        slug: "assigning-staff",
        title: "Assigning Staff",
        category: "Organiser",
        categorySlug: "organiser",
        order: 4,
        video: "",
        excerpt: "Invite judges, tabulators and other staff to your competition.",
        content: `
## Staff Roles

Each sub-event can have its own panel of:
- **Judges** — score contestants
- **Chief Judge** — oversees the judging panel (one per sub-event)
- **Tabulator** — manages timing and score verification
- **Witness** — observes and certifies the process

## Inviting Staff

1. Go to your competition → **Staff** tab
2. Click **Invite Staff**
3. Enter the person's email address and select their role
4. They'll receive an email invitation with a magic link

![Staff assignments](/help-images/organiser/staff-assignments.png)

## Managing Assignments

Use the sub-event assignment panel to assign staff to specific sub-events. A judge can be assigned to multiple sub-events.

> **Tip:** Staff members must have verified accounts before they can be assigned. The invitation email will prompt them to sign up if they don't have an account yet.
`,
    },
    {
        slug: "ticketing-and-voting",
        title: "Ticketing & Voting",
        category: "Organiser",
        categorySlug: "organiser",
        order: 5,
        video: "",
        excerpt: "Configure ticket sales and People's Choice audience voting.",
        content: `
## Ticketing

Each sub-event can be configured with:
- **Ticket type** — free, paid, or donation-based
- **Ticket price** — set per sub-event
- **Max tickets** — limit capacity
- **QR code check-in** — scan tickets at the door

![Ticketing settings](/help-images/organiser/ticketing.png)

## People's Choice Voting

Enable audience voting on your competition to let ticket holders cast votes for their favourite contestants.

1. Toggle **Voting Enabled** on the competition settings
2. Optionally require a ticket number to vote
3. Voters submit their name, email, and optional phone number
4. Results appear in the **People's Choice** dashboard

> **Tip:** You can enable or disable voting per sub-event for granular control.
`,
    },
    // ── Judge ─────────────────────────────────────────
    {
        slug: "scoring-a-performance",
        title: "Scoring a Performance",
        category: "Judge",
        categorySlug: "judge",
        order: 1,
        video: "",
        excerpt: "Use the rubric sliders to score each contestant's performance.",
        content: `
## Accessing the Scoring Interface

Navigate to **Judging** from your dashboard, then select the competition and sub-event you're assigned to. Click **Score** to open the scoring interface.

![Judge scoring interface](/help-images/judge/scoring-interface.png)

## Scoring with Sliders

Each rubric criterion appears as a **slider** ranging from 1 to 5. Drag the slider or click a position to set your score.

- Hover over the slider to see the description for each level
- The weighted score updates in real-time as you adjust

## Adding Comments

Use the **Comments** section below the sliders to provide qualitative feedback. These comments are shared with the contestant after results are published.

## Saving Your Scores

Scores are **auto-saved** as you adjust sliders. A confirmation toast appears when your score is saved.

> **Tip:** You can return to a contestant's scorecard and adjust scores until the chief judge certifies the sub-event.
`,
    },
    {
        slug: "using-the-timer",
        title: "Using the Timer",
        category: "Judge",
        categorySlug: "judge",
        order: 2,
        video: "",
        excerpt: "View the live performance timer synced from the tabulator.",
        content: `
## Read-Only Timer

As a judge, you can see a **read-only** view of the performance timer that the tabulator controls. This helps you keep track of time without managing it yourself.

![Read-only timer](/help-images/judge/read-only-timer.png)

## Timer States

- **Idle** — waiting for the performance to start
- **Running** — performance is in progress (green indicator)
- **Paused** — performance is temporarily paused
- **Stopped** — performance has ended

## Time Penalties

If the performance exceeds the time limit, penalty points are automatically calculated based on the competition's penalty rules and displayed on the scorecard.

> **Tip:** Focus on scoring — the tabulator manages all timing and penalty calculations.
`,
    },
    {
        slug: "certifying-scorecards",
        title: "Certifying Scorecards",
        category: "Judge",
        categorySlug: "judge",
        order: 3,
        video: "",
        excerpt: "Review and digitally sign your completed scorecards.",
        content: `
## When to Certify

After you've scored all contestants in a sub-event, you can certify your scorecard. This locks your scores and adds your digital signature.

## Digital Signature

Use the signature pad to draw your signature. This is captured and stored alongside your scores for audit purposes.

![Signature pad](/help-images/judge/signature-pad.png)

## What Happens After Certification

- Your scores become **read-only**
- The chief judge can view your certified scores
- Your signature appears on the printable scorecard

> **Important:** Once certified, scores cannot be changed unless the chief judge decertifies the sub-event. Make sure all scores are final before certifying.
`,
    },
    {
        slug: "judge-dashboard-overview",
        title: "Judge Dashboard Overview",
        category: "Judge",
        categorySlug: "judge",
        order: 4,
        video: "",
        excerpt: "Navigate your judge dashboard and find your assigned competitions.",
        content: `
## Accessing the Judge Dashboard

After logging in with a judge account, click **Judge Dashboard** from the main navigation or sidebar. This is your central hub for all judging activities.

## Dashboard Layout

### Welcome Section
- Your title: "Judge Dashboard"
- Summary message showing number of competitions you're assigned to
- Quick stats: "You have assignments in X competition(s)"

### Competition Cards

Each competition you're assigned to appears as a card. On each card you'll find:

#### Quick Links
- 📄 **Rules** — View competition rules and guidelines
- ℹ️ **Rubric** — View the detailed scoring rubric
- ⏱️ **Penalties** — View time limits and grace periods

#### Sub-Event List
Below the quick links are the individual sub-events you're assigned to within that competition:
- Sub-event name (e.g., "Speech - Intermediate Level")
- Level designation
- Your role indicator (Judge or Chief Judge badge)
- Number of contestants
- Scoring progress
- **Start Scoring** button

## No Assignments Yet?

If you see a message saying "No Assignments", it means:
- You haven't been assigned to any sub-events yet
- Contact your competition organiser
- You can check back later as assignments may be added

## Filtering & Search

Click the **search** or **filter** options to narrow down competitions by name, status, or date.

> **Tip:** Bookmark your Judge Dashboard for quick access during competition days.
`,
    },
    {
        slug: "judge-quick-start",
        title: "Judge Quick Start Guide",
        category: "Judge",
        categorySlug: "judge",
        order: 5,
        video: "",
        excerpt: "Get started with judging in 5 minutes — the essentials you need to know.",
        content: `
## Step 1 — Access Your Dashboard

Log in and click **Judge Dashboard** from the navigation menu.

## Step 2 — Review the Rubric

Before you start scoring, click the **Rubric** button on your competition card to understand:
- What each criterion means
- How points are awarded (1–5 scale)
- What descriptions apply at each level

## Step 3 — Start Scoring

Click **Start Scoring** on your assigned sub-event.

![Start scoring button](/help-images/judge/start-scoring.png)

## Step 4 — Score the Performance

1. Select a contestant from the dropdown
2. Move the **rubric sliders** to set your scores (1–5)
3. Optionally add **comments** explaining your scores
4. Click **Save** — your scores are automatically saved

## Step 5 — Certify When Ready

After scoring all contestants:
1. Click **Certify** on the last contestant
2. Review your scores in the certification dialog
3. Draw your **signature** on the signature pad
4. Click **Confirm** to lock your scores

## Done!

Your scores are now certified and the chief judge can view them. You cannot modify certified scores.

> **Pro Tip:** Score while performances are fresh in your mind — save preliminary scores and certify after you've reviewed all contestants.
`,
    },
    {
        slug: "judge-assignment-process",
        title: "Judge Assignment & Access",
        category: "Judge",
        categorySlug: "judge",
        order: 6,
        video: "",
        excerpt: "Understand how you get assigned to competitions and what to do first.",
        content: `
## How Judges Are Assigned

A competition organiser or administrator assigns judges to specific:
- **Sub-events** (e.g., "Evening Gown", "Talent", "Interview")
- **Levels** (e.g., "Beginner", "Intermediate", "Advanced")
- **Role** — whether you're a standard judge or Chief Judge

## Receiving Your Assignment

You'll typically receive:
1. **Email invitation** with a link and brief details
2. **Account creation** prompt (if you don't have an account yet)
3. **First login** takes you directly to your Judge Dashboard

## Verifying Your Assignment

On your Judge Dashboard, check that:
- You see the correct competition(s)
- All assigned sub-events are listed
- Your role (Judge or Chief Judge) is correct

## If Something Is Missing

- Verify your email is correctly registered
- Refresh the page or log out and back in
- Check if the invitation was marked as spam
- Contact your competition organiser

## Dashboard Access Tips

- Bookmark your Judge Dashboard
- You can participate in multiple competitions simultaneously
- Each competition is isolated — you only see your assigned sub-events
- Your dashboard updates in real-time as scores come in

> **Tip:** If you're assigned to multiple sub-events, you'll see them all listed on your dashboard — you can work through them in any order.
`,
    },
    {
        slug: "chief-judge-overview",
        title: "Chief Judge Overview",
        category: "Judge",
        categorySlug: "judge",
        order: 7,
        video: "",
        excerpt: "Lead your judging panel with review, adjustment and certification powers.",
        content: `
## What Is a Chief Judge?

A Chief Judge is a senior judge with oversight responsibilities for a sub-event. In addition to scoring like a regular judge, you have the power to:

- **Monitor** all judges' progress and activity in real-time
- **Review** all submitted scores before final approval
- **Adjust** time penalties if needed
- **Resolve** tie situations between contestants
- **Certify** the entire sub-event results officially

## Chief Judge vs. Regular Judge

| Capability | Judge | Chief Judge |
|---|---|---|
| Score contestants | ✓ | ✓ |
| View their own scores | ✓ | ✓ |
| View other judges' scores | | ✓ |
| Monitor judge activity | | ✓ |
| Adjust penalties | | ✓ |
| Resolve tie-breakers | | ✓ |
| Certify sub-event | | ✓ |

## Chief Judge Dashboard

As a Chief Judge, your dashboard includes additional tabs:

### Panel Monitor
See real-time activity of all judges:
- Who is actively scoring right now
- How many contestants each judge has completed
- Progress percentage per judge
- Last activity timestamp

### Score Review
Compare all judges' scores side-by-side:
- View scores for each contestant from each judge
- See judge comments and reasoning
- Identify inconsistencies or outliers
- Understand score variation

### Penalties Review  
Manage time violations:
- Review original penalty calculations
- Adjust penalties if timing errors occurred
- Add justification notes
- Document your reasoning

### Tie Breaker
Resolve tied scores:
- See which contestants have identical final scores
- Review tie-breaker criteria (if defined)
- Designate the winner
- Document your decision

## Communication with Judges

Use the **Event Chat** to:
- Clarify rubric ambiguities with your judge panel
- Discuss borderline scoring cases
- Coordinate timing or special circumstances
- Provide real-time guidance

> **Important:** As Chief Judge, you're responsible for the integrity and fairness of the entire judging process. Take your review role seriously and reach out to judges if you spot inconsistencies.
`,
    },
    {
        slug: "reviewing-judge-scores",
        title: "Reviewing & Comparing Judge Scores",
        category: "Judge",
        categorySlug: "judge",
        order: 8,
        video: "",
        excerpt: "Compare judge scores side-by-side and identify patterns or outliers (Chief Judge only).",
        content: `
## Accessing Score Review

As a Chief Judge:
1. Go to your **Chief Judge Dashboard**
2. Select the sub-event from the dropdown
3. Click the **Score Review** tab

## Score Comparison Interface

### Contestant List
Shows all contestants in the sub-event with their status:
- Number of judges who have scored them
- Color coding for score consistency (green=agreement, yellow=variation, red=significant disagreement)

### Judge Score Cards
Click on a contestant to see:
- **Side-by-side scores** from each judge
- Judge names and their individual scores per criterion
- **Judge comments** explaining their reasoning
- **Final weighted score** for that contestant
- **Timestamp** when each judge submitted

## What to Look For

**Score Consistency** — Are all judges within 1–2 points? If spread is wider, investigate.

**Outlier Judges** — Does one judge consistently score higher or lower than others? This may indicate calibration issues.

**Comments** — Do judge comments explain any score variation? Different perspectives may be valid.

**Scoring Patterns** — Do certain criteria have more variation? This might indicate ambiguous rubric language.

## Taking Action

If you notice issues:

1. **Discuss with judges** — Use event chat to clarify borderline cases
2. **Review rubric** — Are descriptions clear? 
3. **Document observations** — Note patterns in your certification notes
4. **Make adjustments** — If a judge clearly misunderstood, discuss with them
5. **Accept variation** — Some judging variation is normal and acceptable

> **Note:** You cannot directly edit judge scores. If a serious error exists, contact the competition admin.
`,
    },
    {
        slug: "handling-tie-breakers",
        title: "Resolving Tie-Breaker Situations",
        category: "Judge",
        categorySlug: "judge",
        order: 9,
        video: "",
        excerpt: "Determine winners when contestants have identical scores (Chief Judge only).",
        content: `
## When Tie-Breakers Occur

A tie-breaker situation arises when two or more contestants have the **exact same final weighted score**. The Scorz system automatically identifies these and flags them for Chief Judge resolution.

## Accessing Tie-Breaker Interface

1. Go to your **Chief Judge Dashboard**
2. Click the **Tie Breaker** tab
3. System displays all tied contestants

## Tie-Breaker Methods

### Automatic Criteria
If the competition has defined **tie-breaker criteria** (e.g., "Highest delivery score", "Fewest penalties"), the system may automatically calculate these.

### Manual Selection
1. Review the tied contestants' scores
2. Compare their individual criterion scores
3. Consider comments from judges
4. Select which contestant prevails
5. Add **justification notes** explaining your decision

## Documenting Your Decision

Always include notes on why you chose the winner:
- Which criterion was the deciding factor
- Any special circumstances considered
- Reference to competition rules

## Multiple Tie-Breakers

If more than two contestants are tied:
- Resolve the top two first
- If the new winner then ties with another, resolve again
- Document all decisions

## After Resolution

- The winning contestant is locked in
- Their placement is final
- Justification is recorded for audit purposes

> **Important:** Tie-breaker decisions should be made thoughtfully and documented thoroughly — these are high-stakes decisions that deserve careful consideration.
`,
    },
    {
        slug: "judge-best-practices",
        title: "Judge Best Practices & Tips",
        category: "Judge",
        categorySlug: "judge",
        order: 10,
        video: "",
        excerpt: "Proven strategies for fair, consistent, and high-quality judging.",
        content: `
## Before You Start Scoring

### 1. Understand the Rubric
- [ ] Read each criterion description carefully
- [ ] Understand what distinguishes a 1 vs. 5 score
- [ ] Note any weighted criteria (some count more than others)
- [ ] Ask questions during pre-event judge calibration

### 2. Review Competition Rules
- [ ] Know the time limits and grace periods
- [ ] Understand the penalty structure
- [ ] Clarify any unusual scoring methods
- [ ] Ask the Chief Judge if anything is ambiguous

### 3. Get Aligned with Other Judges
- [ ] Attend judge orientation or calibration session
- [ ] Review sample scorecards if available
- [ ] Discuss borderline cases in advance
- [ ] Establish communication channels (chat, email)

## During Scoring

### 4. Score Immediately After Each Performance
- [ ] Document scores while the performance is fresh
- [ ] Don't wait until later — memory fades
- [ ] Use the comment field to note reasoning
- [ ] Save preliminary scores without certifying yet

### 5. Use the Full Scoring Range
- [ ] Avoid clustering all scores in the middle (3–4)
- [ ] A truly excellent contestant deserves a 5
- [ ] A significantly weak area deserves a 1
- [ ] This creates meaningful differentiation between performances

### 6. Be Consistent Across Contestants
- [ ] Score the first contestant with a particular approach
- [ ] Apply that same standard to subsequent contestants
- [ ] If you change your mental scale, note why
- [ ] Check your first and last scores — avoid drift

### 7. Grade Against the Rubric, Not Against Other Contestants
- Each contestant should be evaluated independently
- Score based on the rubric criteria, not comparisons
- Early contestants shouldn't influence later ones
- Focus on what the rubric says, not personal preference

### 8. Write Meaningful Comments
- [ ] Comment why you gave that score, not just "good job"
- [ ] Example: "Excellent stage presence — clear eye contact and confident posture throughout"
- [ ] Identify both strengths and areas for improvement
- [ ] Help contestants understand how to improve next time

## Before Certifying

### 9. Review All Your Scores
- [ ] Go through each contestant one more time
- [ ] Check for any scoring errors
- [ ] Verify comments align with scores
- [ ] Make sure you used the full scale

### 10. Check for Outliers in Your Scoring
- [ ] Do you have significantly higher or lower scores than other judges? (Review score summary if visible)
- [ ] If so, consider whether you're using the rubric differently
- [ ] It's OK to score differently — but be consistent with your interpretation

### 11. Only Certify When You're Ready
- [ ] Don't rush to sign off
- [ ] Once certified, scores are locked
- [ ] Your signature is a legal commitment
- [ ] Take your time to get it right

## As a Chief Judge

### 12. Prepare Your Judge Panel
- [ ] Meet with judges before scoring begins (if possible)
- [ ] Review the rubric together
- [ ] Share this best practices guide
- [ ] Answer questions proactively

### 13. Monitor Progress
- [ ] Check the Panel Monitor regularly
- [ ] If a judge is falling behind, reach out
- [ ] Watch for scoring patterns as scores come in
- [ ] Flag any concerns early

### 14. Review Comprehensively
- [ ] Don't just check for obvious errors
- [ ] Look for subtle patterns (e.g., one judge always scores higher in "delivery")
- [ ] Read judge comments to understand their reasoning
- [ ] Consider whether variation is acceptable or concerning

### 15. Communicate With Integrity
- [ ] If you need to discuss scores with a judge, be professional
- [ ] Focus on facts, not criticism ("I noticed variation in X" vs. "You scored too high")
- [ ] If a judge made an error, help them understand the rubric better
- [ ] Support fair adjudication — that's your core responsibility

## Common Mistakes to Avoid

❌ **Waiting Too Long to Score** — Performances blur together; score immediately
❌ **Not Using the Full Scale** — Clustering scores 3–5 reduces meaningful differentiation
❌ **Scoring Based on Other Judges** — Score the rubric, not other scores
❌ **Vague Comments** — "Good job" doesn't help contestants improve
❌ **Certifying When Unsure** — Verify everything before you sign

✅ **Do Approach** — Understand rubric deeply → score immediately → use full scale → meaning comments → review carefully → certify with confidence

> **Remember:** Your honest, fair, thoughtful judging contributes to legitimate, trusted results. Contestants, audiences, and organisers rely on your integrity.
`,
    },
    // ── Organiser ─────────────────────────────────────
    {
        slug: "organiser-dashboard-overview",
        title: "Organiser Dashboard Overview",
        category: "Organiser",
        categorySlug: "organiser",
        order: 6,
        video: "",
        excerpt: "Navigate your organiser dashboard and manage multiple competitions.",
        content: `
## Accessing the Organiser Dashboard

After logging in with an organiser account, click **"Organiser Dashboard"** from the main navigation. This is your command center for all competition management activities.

## Dashboard Layout

### Competition Overview
- **Active Competitions**: Currently running events
- **Draft Competitions**: Events in planning
- **Completed Events**: Past competitions with results
- **Quick Stats**: Total registrations, revenue, upcoming deadlines

### Quick Actions Panel
- **Create Competition**: Start a new event
- **View Analytics**: Performance metrics across competitions
- **Manage Staff**: Assign roles and permissions
- **Financial Overview**: Revenue and payment tracking

### Recent Activity Feed
- **Registration Updates**: New contestant signups
- **Staff Assignments**: Recent role assignments
- **Competition Milestones**: Important dates approaching
- **System Notifications**: Platform updates and alerts

## Competition Management Cards

Each competition displays as a card with:
- **Status Badge**: Draft, Published, Active, Completed
- **Key Metrics**: Registrations, sub-events, staff count
- **Quick Links**: Edit, View Public Page, Analytics
- **Progress Indicators**: Setup completion percentage

## Filtering & Search

Use filters to organize your view:
- **By Status**: Active, draft, completed
- **By Date**: Upcoming, recent, past
- **By Type**: Pageant, speech contest, etc.
- **Search Bar**: Find specific competitions by name

> **Tip:** Bookmark your organiser dashboard for quick access during busy competition periods.
`,
    },
    {
        slug: "competition-planning-guide",
        title: "Competition Planning Guide",
        category: "Organiser",
        categorySlug: "organiser",
        order: 7,
        video: "",
        excerpt: "Step-by-step guide to planning and launching a successful competition.",
        content: `
## Phase 1: Conceptual Planning (1-3 Months Before)

### Define Your Vision
- **Competition Type**: Pageant, speech contest, talent show, debate
- **Target Audience**: Age groups, experience levels, geographic scope
- **Unique Selling Points**: What makes your event special
- **Goals & Objectives**: What you want to achieve

### Budget Planning
- **Venue Costs**: Location rental, AV equipment, staging
- **Staff Compensation**: Judges, tabulators, technical crew
- **Marketing Expenses**: Advertising, social media, promotions
- **Contingency Fund**: 10-15% for unexpected costs

### Timeline Development
- **Key Milestones**: Registration opens, judging dates, finale
- **Dependencies**: Venue availability, staff commitments
- **Buffer Time**: Extra days for unexpected delays

## Phase 2: Setup & Configuration (2-4 Weeks Before)

### Competition Structure
- **Create Competition**: Basic details and branding
- **Define Levels**: Beginner, Intermediate, Advanced categories
- **Set Up Sub-Events**: Individual competition categories
- **Configure Rubric**: Judging criteria and weights

### Staff Recruitment
- **Identify Needs**: Judges, tabulators, technical staff
- **Send Invitations**: Use Scorz's staff management system
- **Training Sessions**: Prepare staff for their roles
- **Backup Planning**: Secondary staff for emergencies

### Marketing & Registration
- **Launch Public Page**: Competition website goes live
- **Open Registration**: Set registration periods and fees
- **Social Media Campaign**: Build excitement and awareness
- **Partnership Outreach**: Sponsors, media, influencers

## Phase 3: Pre-Competition (1-2 Weeks Before)

### Final Preparations
- **Staff Confirmations**: All roles filled and confirmed
- **Venue Setup**: Technical requirements confirmed
- **Contestant Communication**: Welcome emails and instructions
- **Emergency Protocols**: Backup plans and contact lists

### Technical Checks
- **Platform Testing**: All Scorz features working
- **Staff Training**: Final role-specific briefings
- **Backup Systems**: Alternative platforms if needed
- **Communication Channels**: Chat, email, phone chains

## Phase 4: Competition Execution (Event Days)

### Day-Of Management
- **Staff Check-in**: Confirm all personnel present
- **Technical Setup**: AV, timing, scoring systems
- **Contestant Management**: Check-in and preparation
- **Schedule Adherence**: Keep events on time

### Real-Time Monitoring
- **Progress Tracking**: Monitor judging and tabulation
- **Issue Resolution**: Handle technical or logistical problems
- **Communication**: Keep all parties informed
- **Quality Control**: Ensure fair and smooth proceedings

## Phase 5: Post-Competition (After Event)

### Results & Communication
- **Certification**: Finalize and lock results
- **Announcement**: Share results with contestants and public
- **Certificates**: Generate and distribute awards
- **Feedback Collection**: Gather input from all participants

### Analysis & Improvement
- **Performance Review**: What worked well, what didn't
- **Financial Reconciliation**: Final budget vs. actuals
- **Staff Debrief**: Lessons learned session
- **Planning for Next**: Apply insights to future events

## Success Metrics

### Quantitative Measures
- **Registration Numbers**: Target vs. actual
- **Revenue Performance**: Budget vs. actuals
- **Attendee Satisfaction**: Survey results
- **Media Coverage**: Press mentions and reach

### Qualitative Measures
- **Participant Feedback**: Contestant and staff comments
- **Process Efficiency**: Smoothness of execution
- **Innovation Impact**: New approaches that worked
- **Community Impact**: Broader event influence

> **Pro Tip:** Start planning 3-6 months in advance for major competitions. Use checklists and assign responsibilities to team members to ensure nothing falls through the cracks.
`,
    },
    {
        slug: "staff-management-system",
        title: "Staff Management System",
        category: "Organiser",
        categorySlug: "organiser",
        order: 8,
        video: "",
        excerpt: "Invite, assign, and manage judges, tabulators, and other competition staff.",
        content: `
## Understanding Staff Roles

### Core Competition Roles
- **Judges**: Score contestants on rubric criteria
- **Chief Judges**: Oversee judging panels and resolve disputes
- **Tabulators**: Time performances and verify score accuracy
- **Witnesses**: Observe proceedings for integrity
- **Technical Staff**: AV, lighting, sound operators
- **Stage Managers**: Coordinate backstage and timing

### Administrative Roles
- **Registration Coordinators**: Manage contestant applications
- **Hospitality Staff**: Handle contestant and guest services
- **Security Personnel**: Venue safety and access control
- **Medical Staff**: Health and emergency response
- **Volunteers**: General event support

## Inviting Staff Members

### Step 1: Access Staff Management
1. Go to your competition → **"Staff"** tab
2. Click **"Invite Staff"**
3. Select invitation method

### Step 2: Send Invitations
**Individual Invitations**:
- Enter email address
- Select role and sub-event assignments
- Add personal message
- Send invitation

**Bulk Invitations**:
- Upload CSV with staff details
- Assign roles in bulk
- Send batch invitations
- Track response rates

### Step 3: Follow Up
- **Reminder Emails**: Automatic follow-ups for non-responders
- **Status Tracking**: See who accepted, declined, or hasn't responded
- **Re-invitations**: Send to alternates if needed

## Role Assignments

### Sub-Event Specific Roles
- **Judges & Chief Judges**: Assigned to specific sub-events
- **Tabulators**: May cover multiple sub-events
- **Witnesses**: Can observe multiple events

### Assignment Management
- **Add Assignments**: Assign staff to additional sub-events
- **Remove Assignments**: Reassign or remove staff
- **Role Changes**: Modify staff roles if needed
- **Backup Assignments**: Secondary staff for each role

## Staff Communication

### Built-in Communication Tools
- **Event Chat**: Real-time messaging for all assigned staff
- **Role-specific Channels**: Private discussions by role
- **Announcement System**: Broadcast important updates
- **Document Sharing**: Rules, schedules, and resources

### Communication Best Practices
- **Pre-Event Briefings**: Send detailed instructions
- **Schedule Updates**: Keep everyone informed of changes
- **Emergency Protocols**: Clear communication chains
- **Feedback Channels**: Ways for staff to report issues

## Staff Training & Preparation

### Pre-Event Training
- **Role-specific Training**: Detailed walkthroughs
- **Platform Tutorials**: How to use Scorz effectively
- **Process Reviews**: Step-by-step procedures
- **Q&A Sessions**: Address concerns and questions

### Resource Provision
- **Digital Guides**: Downloadable manuals and checklists
- **Video Tutorials**: Visual training materials
- **Contact Lists**: Emergency and support contacts
- **Equipment Lists**: What staff need to bring

## During Competition Management

### Staff Check-in
- **Arrival Confirmation**: Track who has arrived
- **Equipment Verification**: Ensure staff have what they need
- **Assignment Confirmation**: Final role assignments
- **Communication Setup**: Test chat and emergency contacts

### Real-Time Support
- **Technical Assistance**: Help with platform issues
- **Process Guidance**: Answer questions during event
- **Issue Resolution**: Handle problems as they arise
- **Status Updates**: Keep staff informed of progress

## Post-Competition Staff Management

### Feedback Collection
- **Staff Surveys**: Gather feedback on processes
- **Performance Reviews**: Document staff effectiveness
- **Issue Documentation**: Record problems and resolutions
- **Improvement Suggestions**: Ideas for future events

### Payment & Compensation
- **Payment Tracking**: Hours worked, rates, totals
- **Invoice Generation**: Automated payment requests
- **Tax Documentation**: Required forms and records
- **Payment Processing**: Secure payment methods

## Staff Database Management

### Building Your Team
- **Contact Database**: Maintain staff contact information
- **Performance History**: Track past event participation
- **Availability Calendar**: Schedule planning
- **Skill Tracking**: Special skills and certifications

### Long-term Relationships
- **Regular Communication**: Stay in touch between events
- **Professional Development**: Training opportunities
- **Recognition Programs**: Awards for outstanding service
- **Referral Networks**: Expand your staff pool

> **Tip:** Start staff recruitment 4-6 weeks before your event. Send invitations early and follow up regularly to ensure full staffing.
`,
    },
    {
        slug: "financial-management",
        title: "Financial Management",
        category: "Organiser",
        categorySlug: "organiser",
        order: 9,
        video: "",
        excerpt: "Track revenue, manage payments, and handle financial aspects of competitions.",
        content: `
## Revenue Streams

### Registration Fees
- **Base Entry Fees**: Per competition registration
- **Sub-Event Fees**: Additional charges per category
- **Late Registration**: Penalty fees for late entries
- **Premium Options**: VIP packages or upgrades

### Ticketing Revenue
- **Audience Tickets**: General admission pricing
- **VIP Packages**: Premium seating and experiences
- **Group Discounts**: Bulk purchase options
- **Dynamic Pricing**: Time-based price adjustments

### Sponsorship & Partnerships
- **Title Sponsorships**: Naming rights and branding
- **Category Sponsors**: Sub-event specific partnerships
- **Vendor Booths**: Exhibition space revenue
- **Media Rights**: Broadcasting and coverage fees

## Payment Processing

### Integrated Payment System
- **Secure Processing**: PCI-compliant payment gateway
- **Multiple Methods**: Cards, digital wallets, bank transfers
- **Currency Support**: Multi-currency for international events
- **Mobile Payments**: Phone and contactless options

### Payment Flow
1. **Registration**: Contestant selects payment method
2. **Processing**: Secure transaction through gateway
3. **Confirmation**: Instant payment verification
4. **Receipt**: Automatic email receipt generation

## Financial Dashboard

### Revenue Tracking
- **Real-time Totals**: Current revenue across all streams
- **Projection Tools**: Forecast final revenue
- **Payment Status**: Track paid vs. pending registrations
- **Refund Management**: Process refund requests

### Expense Tracking
- **Budget Categories**: Venue, staff, marketing, equipment
- **Actual vs. Budget**: Compare planned vs. actual spending
- **Vendor Payments**: Track payments to suppliers
- **Contingency Funds**: Monitor emergency reserves

## Registration Management

### Fee Structures
- **Tiered Pricing**: Early bird, regular, late fees
- **Discount Codes**: Promotional and group discounts
- **Payment Plans**: Installment options for large fees
- **Scholarships**: Reduced fees for qualifying contestants

### Refund Policies
- **Cancellation Windows**: Refund periods and amounts
- **Policy Communication**: Clear refund terms for contestants
- **Automated Processing**: Self-service refund requests
- **Manual Reviews**: Special circumstance approvals

## Reporting & Analytics

### Financial Reports
- **Revenue Breakdown**: By category and time period
- **Expense Analysis**: Spending patterns and trends
- **Profit/Loss**: Overall financial performance
- **Tax Preparation**: Documentation for accounting

### Performance Metrics
- **ROI Analysis**: Return on marketing investment
- **Break-even Analysis**: When costs are covered
- **Trend Analysis**: Year-over-year comparisons
- **Forecasting**: Future event financial projections

## Tax & Legal Compliance

### Tax Considerations
- **Sales Tax**: Collection and remittance
- **Income Tax**: Business income reporting
- **Vendor Taxes**: 1099 forms for payments
- **International**: Cross-border tax implications

### Financial Records
- **Receipt Storage**: Digital receipt management
- **Audit Trail**: Complete transaction history
- **Backup Systems**: Secure data preservation
- **Retention Policies**: How long to keep records

## Risk Management

### Financial Risks
- **Non-payment**: Contestants who don't complete payment
- **Chargebacks**: Credit card disputes
- **Currency Fluctuation**: International payment risks
- **Vendor Issues**: Supplier payment disputes

### Mitigation Strategies
- **Payment Verification**: Confirm payment before allowing participation
- **Clear Policies**: Communicate refund and payment terms
- **Insurance**: Event cancellation and liability coverage
- **Contingency Planning**: Backup funding sources

> **Tip:** Set up automatic financial reporting to track revenue and expenses in real-time. This helps you make informed decisions during the competition.
`,
    },
    {
        slug: "marketing-your-competition",
        title: "Marketing Your Competition",
        category: "Organiser",
        categorySlug: "organiser",
        order: 10,
        video: "",
        excerpt: "Promote your competition and drive registrations through effective marketing.",
        content: `
## Digital Marketing Strategy

### Website & SEO
- **Competition Page**: Compelling event description
- **SEO Optimization**: Keywords for search visibility
- **Mobile-Friendly**: Responsive design for all devices
- **Fast Loading**: Optimized images and content

### Social Media Campaigns
- **Platform Selection**: Choose relevant social networks
- **Content Calendar**: Regular posting schedule
- **Hashtag Creation**: Unique event hashtags
- **Influencer Partnerships**: Collaborate with relevant creators

### Email Marketing
- **Registration Lists**: Build prospect databases
- **Teaser Campaigns**: Build anticipation
- **Reminder Sequences**: Deadline and event notifications
- **Post-Event Follow-up**: Maintain relationships

## Content Marketing

### Blog & Articles
- **Behind-the-Scenes**: Event preparation stories
- **Contestant Spotlights**: Feature participants
- **Tips & Advice**: Competition preparation guides
- **Industry Insights**: Relevant trend articles

### Video Content
- **Promo Videos**: Highlight event features
- **Testimonials**: Past participant feedback
- **Virtual Tours**: Venue and facility previews
- **Tutorial Videos**: How to register and prepare

## Partnership & Sponsorship

### Sponsorship Opportunities
- **Title Sponsors**: Main event naming rights
- **Category Sponsors**: Sub-event specific partnerships
- **Vendor Partnerships**: Product and service integrations
- **Media Sponsors**: Coverage and promotion support

### Partnership Benefits
- **Financial Support**: Additional revenue streams
- **Marketing Reach**: Partner networks and audiences
- **Credibility**: Association with established brands
- **Added Value**: Enhanced event offerings

## Public Relations

### Media Outreach
- **Press Releases**: Event announcements and milestones
- **Media Kits**: Press photos, bios, and information
- **Interview Opportunities**: Spokesperson availability
- **Story Angles**: Unique event aspects for coverage

### Community Engagement
- **Local Partnerships**: Community organization involvement
- **Charity Tie-ins**: Cause-related marketing
- **School Programs**: Educational institution participation
- **Industry Associations**: Professional group involvement

## Registration Conversion

### Landing Page Optimization
- **Clear Value Proposition**: Why attend this event
- **Social Proof**: Testimonials and past results
- **Easy Registration**: Streamlined signup process
- **Trust Signals**: Security badges, guarantees

### Conversion Funnels
- **Awareness**: Initial interest generation
- **Consideration**: Detailed information provision
- **Decision**: Registration encouragement
- **Retention**: Post-registration engagement

## Analytics & Measurement

### Marketing Metrics
- **Website Traffic**: Visitor numbers and sources
- **Social Engagement**: Likes, shares, comments
- **Email Performance**: Open rates, click-throughs
- **Conversion Rates**: Visitors to registrants

### ROI Tracking
- **Cost per Registration**: Marketing spend efficiency
- **Channel Performance**: Best performing marketing sources
- **Customer Lifetime Value**: Long-term participant relationships
- **Brand Impact**: Reputation and awareness growth

## Crisis Communication

### Issue Management
- **Rapid Response**: Quick acknowledgment of problems
- **Transparent Communication**: Honest situation updates
- **Solution Focus**: Emphasis on resolution steps
- **Stakeholder Updates**: Regular progress reports

### Reputation Management
- **Online Monitoring**: Social media and review tracking
- **Response Strategy**: Professional issue handling
- **Recovery Planning**: Steps to restore confidence
- **Prevention**: Risk mitigation for future events

> **Tip:** Start marketing 3-6 months in advance for major competitions. Focus on building excitement and clearly communicating the unique value of your event.
`,
    },
    // ── Tabulator ─────────────────────────────────────
    {
        slug: "tabulator-getting-started",
        title: "Tabulator Getting Started",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 4,
        video: "",
        excerpt: "Set up your tabulator account and understand your responsibilities.",
        content: `
## Account Setup & Access

### Receiving Your Assignment
1. **Email Invitation**: Competition organiser sends invitation
2. **Magic Link**: Click link to accept and set up account
3. **Role Assignment**: Automatically assigned "Tabulator" role
4. **Dashboard Access**: Full access to timing and verification tools

### First Login Experience
- **Welcome Screen**: Introduction to tabulator responsibilities
- **Quick Setup**: Basic preferences and notifications
- **Training Resources**: Links to guides and tutorials
- **Assigned Competitions**: Your active timing assignments

## Understanding Your Role

### Core Responsibilities
- **Performance Timing**: Accurate start/stop timing for all contestants
- **Score Verification**: Compare digital scores against physical records
- **Penalty Application**: Calculate and apply time-based penalties
- **Results Certification**: Final sign-off on competition results

### Why Accuracy Matters
- **Fairness**: Precise timing ensures equal opportunities
- **Integrity**: Verification prevents scoring errors
- **Compliance**: Proper penalties maintain competition rules
- **Audit Trail**: Your certification provides legal documentation

## Dashboard Overview

### Main Interface
- **Contestant List**: All performers for your assigned sub-events
- **Timer Controls**: Primary timing interface
- **Score Verification**: Digital vs. physical comparison tools
- **Penalty Calculator**: Automatic penalty applications

### Navigation Elements
- **Sub-event Selector**: Switch between assigned events
- **Status Indicators**: Current timing and verification status
- **Communication Panel**: Chat with judges and organisers
- **Help Resources**: Quick access to guides and support

## Pre-Competition Preparation

### Review Competition Details
**Essential Information**:
- Sub-event schedules and contestant lists
- Time limits and grace periods
- Penalty rules and calculations
- Special timing requirements

**Access Methods**:
- Competition details in your dashboard
- Direct communication with organiser
- Physical documents if provided
- Online resource library

### Equipment & Technical Setup
**Required Equipment**:
- Reliable device (laptop/tablet recommended)
- Stable internet connection
- Backup power source
- Physical timing sheets (backup)

**Technical Verification**:
- Test timer functionality
- Verify internet connectivity
- Check browser compatibility
- Confirm audio/video capabilities

> **Tip:** Arrive at the venue 30-60 minutes early to set up your workspace and test all equipment. Have backup devices and physical timing methods ready.
`,
    },
    {
        slug: "performance-timing-techniques",
        title: "Performance Timing Techniques",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 5,
        video: "",
        excerpt: "Master the art of accurate performance timing with professional techniques.",
        content: `
## Timing Fundamentals

### Precision Timing Principles
- **Consistent Start Points**: Use the same cue for every performance
- **Clear Stop Signals**: Well-defined performance endings
- **Reaction Time**: Account for your own response delay
- **Backup Methods**: Multiple timing verification approaches

### Timer Types & States
- **Countdown Timer**: Shows time remaining
- **Stopwatch Mode**: Shows elapsed time
- **Pause Function**: Temporary stops for interruptions
- **Reset Capability**: Clear for next performance

## Timing a Performance

### Pre-Performance Setup
1. **Contestant Selection**: Choose current performer from list
2. **Verification**: Confirm correct person and performance order
3. **Preparation**: Ensure clear view of performance area
4. **Communication**: Signal readiness to stage manager

### Start Timing
- **Trigger Point**: Exact moment performance begins
- **Visual Cues**: Watch for performer movement or sound
- **Consistent Method**: Use same start trigger every time
- **Documentation**: Note any unusual start conditions

### During Performance
- **Continuous Monitoring**: Watch for time approaching limits
- **Interruption Handling**: Pause for technical issues
- **Communication**: Alert performer if approaching time limits
- **Backup Timing**: Use secondary method simultaneously

### Stop Timing
- **End Point Definition**: Clear performance conclusion
- **Precise Stop**: Stop at exact end moment
- **Duration Recording**: Automatic save to system
- **Verification**: Confirm recorded time is accurate

## Special Timing Scenarios

### Interruptions & Pauses
- **Technical Issues**: Equipment failures, sound problems
- **Medical Emergencies**: Health-related stops
- **Rule Violations**: Brief pauses for warnings
- **Environmental Factors**: Weather, venue issues

**Handling Process**:
1. Pause timer immediately
2. Document reason for pause
3. Resume when appropriate
4. Adjust total time if approved
5. Continue timing normally

### Multiple Rounds
- **Round Transitions**: Clear breaks between rounds
- **Cumulative Timing**: Track total vs. per-round time
- **Reset Procedures**: Clear timer for each round
- **Documentation**: Record each round's duration

### Team Performances
- **Start Triggers**: When first performer begins
- **Stop Points**: When last performer finishes
- **Group Coordination**: Communication with all team members
- **Individual Tracking**: Note any individual time issues

## Timing Accuracy Techniques

### Reaction Time Compensation
- **Practice Drills**: Regular timing practice sessions
- **Calibration**: Test your personal reaction time
- **Consistent Method**: Use same technique every time
- **Backup Verification**: Secondary timing confirmation

### Environmental Factors
- **Lighting**: Ensure good visibility of performance area
- **Audio**: Clear sound cues for start/stop points
- **Distance**: Optimal viewing position
- **Distractions**: Minimize background noise and interruptions

### Technology Optimization
- **Device Selection**: Use reliable, fast devices
- **Screen Position**: Optimal viewing angle
- **Input Methods**: Keyboard shortcuts for speed
- **Backup Systems**: Secondary timing devices

## Time Limit Management

### Grace Period Handling
- **Automatic Extension**: System applies grace period
- **No Penalty Zone**: Buffer time before penalties
- **Clear Communication**: Inform performers of grace period
- **Documentation**: Record grace period usage

### Penalty Calculation
- **Automatic Application**: System calculates penalties
- **Rate Structure**: Points per time unit exceeded
- **Documentation**: Clear penalty reasoning
- **Appeal Process**: Handle penalty disputes

## Quality Assurance

### Self-Checking Techniques
- **Double Verification**: Check recorded times
- **Consistency Review**: Compare similar performances
- **Pattern Recognition**: Spot timing anomalies
- **Peer Review**: Compare with other tabulators

### Documentation Standards
- **Timing Logs**: Detailed records of all timings
- **Interruption Notes**: Reasons for pauses
- **Special Circumstances**: Unusual timing situations
- **Quality Metrics**: Your accuracy statistics

> **Pro Tip:** Practice timing with sample videos before competition day. Focus on consistency and develop a personal timing ritual for maximum accuracy.
`,
    },
    {
        slug: "score-verification-process",
        title: "Score Verification Process",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 6,
        video: "",
        excerpt: "Verify digital judge scores against physical records for accuracy and integrity.",
        content: `
## Understanding Score Verification

### Why Verification Matters
- **Accuracy Assurance**: Catch data entry errors
- **Integrity Protection**: Prevent scoring manipulation
- **Legal Compliance**: Provide audit trail for results
- **Fairness Guarantee**: Ensure all scores are correctly recorded

### Verification Timing
- **Real-time**: During active scoring periods
- **Batch Processing**: End-of-sub-event verification
- **Final Review**: Before results certification
- **Dispute Resolution**: When discrepancies are reported

## Accessing Verification Tools

### Verification Dashboard
1. Go to **"Score Verification"** tab
2. Select sub-event to verify
3. Choose verification method
4. Access comparison tools

### Available Tools
- **Side-by-Side View**: Digital vs. physical comparison
- **Discrepancy Logger**: Record and track differences
- **Judge Communication**: Contact judges about issues
- **Audit Trail**: Complete verification history

## Verification Process

### Preparation Phase
1. **Gather Materials**: Physical score sheets from judges
2. **System Access**: Ensure all digital scores are submitted
3. **Judge Confirmation**: Verify all judges have certified
4. **Workspace Setup**: Quiet area for careful comparison

### Systematic Verification
1. **Contestant Selection**: Choose first contestant to verify
2. **Digital Review**: Examine scores in the system
3. **Physical Comparison**: Check against paper records
4. **Discrepancy Check**: Look for any differences
5. **Documentation**: Record findings and resolutions

### Per-Contestant Verification
**Check Each Element**:
- Judge names and assignments
- All rubric criterion scores
- Written comments and notes
- Mathematical calculations
- Signature presence and validity

## Identifying Discrepancies

### Common Issues
- **Data Entry Errors**: Typos in score recording
- **Judge Misidentification**: Wrong judge assigned
- **Missing Scores**: Incomplete scoring submissions
- **Calculation Mistakes**: Math errors in averaging
- **Comment Omissions**: Missing required feedback

### Severity Levels
- **Minor**: Typos, formatting issues (can be corrected)
- **Moderate**: Score differences of 1-2 points (investigation needed)
- **Major**: Significant discrepancies (judge re-scoring may be required)
- **Critical**: Evidence of misconduct (organiser involvement required)

## Resolution Procedures

### Minor Corrections
1. **Document Issue**: Record the discrepancy clearly
2. **Contact Judge**: Use chat or direct communication
3. **Confirm Correction**: Verify fix with judge
4. **Update Records**: Apply correction in system
5. **Re-certify**: Have judge sign off again

### Major Discrepancies
1. **Detailed Documentation**: Comprehensive issue recording
2. **Judge Interview**: Discuss discrepancy privately
3. **Evidence Review**: Examine physical records carefully
4. **Resolution Decision**: Determine appropriate fix
5. **Approval Process**: Chief judge or organiser approval

### Escalation Protocol
- **Chief Judge Involvement**: For scoring disputes
- **Organiser Notification**: Major integrity concerns
- **Legal Consultation**: Serious misconduct allegations
- **Result Delay**: If resolution requires time

## Documentation Requirements

### Verification Records
- **Date and Time**: When verification was performed
- **Tabulator Identity**: Your name and credentials
- **Method Used**: Digital vs. physical comparison
- **Issues Found**: Detailed discrepancy descriptions
- **Resolutions Applied**: How each issue was handled

### Audit Trail Maintenance
- **Complete History**: All verification actions logged
- **Timestamp Tracking**: When each action occurred
- **User Attribution**: Who performed each verification
- **Change Documentation**: Before/after values for corrections

## Quality Control

### Verification Standards
- **100% Coverage**: Every score verified against physical records
- **Dual Check**: Two people verify major discrepancies
- **Random Sampling**: Spot checks on previously verified scores
- **Consistency Review**: Compare verification across judges

### Performance Metrics
- **Accuracy Rate**: Percentage of error-free verifications
- **Issue Resolution Time**: How quickly discrepancies are resolved
- **Judge Satisfaction**: Feedback on verification process
- **Process Efficiency**: Time spent per verification

## Communication Protocols

### Judge Communication
- **Professional Tone**: Respectful and factual
- **Clear Explanations**: Explain verification purpose
- **Confidentiality**: Private discussion of issues
- **Resolution Focus**: Emphasize fair and accurate results

### Organiser Updates
- **Regular Reports**: Verification progress updates
- **Issue Alerts**: Major discrepancies requiring attention
- **Timeline Estimates**: When verification will be complete
- **Confidence Levels**: Assurance in final results

> **Tip:** Approach verification with a mindset of accuracy, not accusation. Most discrepancies are honest mistakes that can be easily corrected through clear communication.
`,
    },
    {
        slug: "penalty-management-guide",
        title: "Penalty Management Guide",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 7,
        video: "",
        excerpt: "Apply time penalties accurately and handle penalty-related disputes.",
        content: `
## Understanding Penalty Rules

### Penalty Components
- **Time Limit**: Maximum allowed performance time
- **Grace Period**: Buffer time before penalties apply
- **Penalty Rate**: Points deducted per time unit
- **Penalty Type**: Flat rate, per second, or tiered structure

### Common Penalty Structures
- **Simple Rate**: 1 point per 30 seconds over time limit
- **Tiered System**: Higher rates for greater time excesses
- **Flat Penalty**: Fixed deduction for any time violation
- **Percentage Based**: Deduction as percentage of total score

## Automatic Penalty Application

### System Integration
- **Real-time Calculation**: Penalties applied as timing completes
- **Judge Visibility**: Penalties appear in judge scorecards
- **Automatic Deduction**: Applied to final contestant scores
- **Audit Trail**: Complete penalty calculation history

### Calculation Process
1. **Duration Recorded**: Timer stop captures exact time
2. **Limit Comparison**: System compares to time limit
3. **Grace Period Check**: Determines if penalty applies
4. **Rate Application**: Calculates deduction amount
5. **Score Adjustment**: Applies to contestant's total

## Manual Penalty Adjustments

### When Adjustments Are Needed
- **Timing Errors**: Incorrect duration recording
- **Technical Issues**: Equipment or environmental problems
- **Special Accommodations**: Approved time extensions
- **Dispute Resolution**: Organiser-approved changes

### Adjustment Process
1. **Document Reason**: Clear justification for change
2. **Calculate New Penalty**: Recalculate based on corrected time
3. **Apply Adjustment**: Update in penalty system
4. **Notify Affected Parties**: Inform judges and contestant
5. **Record Change**: Complete audit documentation

## Penalty Review Procedures

### Regular Reviews
- **Pre-Certification**: Review all penalties before finalizing
- **Accuracy Check**: Verify calculations are correct
- **Consistency Review**: Ensure uniform application
- **Appeal Handling**: Process penalty dispute requests

### Documentation Requirements
- **Original Timing**: Recorded performance duration
- **Penalty Calculation**: Step-by-step deduction process
- **Adjustment Reasons**: Why any changes were made
- **Approval Authority**: Who authorized adjustments

## Handling Penalty Disputes

### Contestant Appeals
1. **Receive Appeal**: Contestant submits dispute request
2. **Review Evidence**: Examine timing records and video
3. **Consult Rules**: Check competition penalty policy
4. **Make Decision**: Approve or deny adjustment
5. **Communicate Result**: Inform contestant of outcome

### Judge Disputes
1. **Judge Concern**: Judge questions penalty application
2. **Technical Review**: Verify timing accuracy
3. **Rule Interpretation**: Confirm penalty rules
4. **Resolution**: Adjust if error confirmed
5. **Documentation**: Record dispute and resolution

## Special Penalty Scenarios

### Technical Interruptions
- **Equipment Failure**: Pause timer, resume after fix
- **No Penalty**: If interruption causes time loss
- **Documentation**: Record interruption details
- **Adjustment**: Potential time addition approval

### Medical Emergencies
- **Immediate Pause**: Stop timing for health issues
- **No Penalty**: Medical situations don't incur penalties
- **Documentation**: Record medical interruption
- **Resumption**: Continue timing when safe

### Environmental Factors
- **Weather Delays**: Outdoor event interruptions
- **Venue Issues**: Technical or facility problems
- **Penalty Waiver**: May be approved by organiser
- **Documentation**: Record environmental factors

## Penalty Communication

### Contestant Notification
- **Clear Explanation**: How penalty was calculated
- **Evidence Provided**: Timing records and rules reference
- **Appeal Process**: How to dispute if desired
- **Final Decision**: Clear communication of outcome

### Judge Updates
- **Penalty Visibility**: Judges see penalties in real-time
- **Adjustment Alerts**: Notification of any changes
- **Reasoning Provided**: Why adjustments were made
- **Consistency Assurance**: Uniform penalty application

## Quality Assurance

### Penalty Accuracy Checks
- **Double Verification**: Two people check calculations
- **Random Sampling**: Spot check penalty applications
- **Historical Comparison**: Compare to past competitions
- **Rule Compliance**: Ensure all penalties follow rules

### Performance Metrics
- **Accuracy Rate**: Percentage of correct penalty applications
- **Appeal Rate**: Frequency of successful penalty disputes
- **Processing Time**: How quickly penalties are resolved
- **Satisfaction Scores**: Contestant and judge feedback

## Legal & Compliance Considerations

### Documentation Standards
- **Complete Records**: All penalty decisions documented
- **Audit Trail**: Who made decisions and when
- **Evidence Preservation**: Timing records and communications
- **Retention Policy**: How long records are kept

### Dispute Resolution Framework
- **Clear Process**: Defined steps for penalty appeals
- **Timely Resolution**: Reasonable timeframes for decisions
- **Fair Treatment**: Consistent application for all contestants
- **Final Authority**: Clear escalation path

> **Tip:** Always document penalty decisions thoroughly. Clear records protect both the competition integrity and provide evidence for any disputes or legal challenges.
`,
    },
    {
        slug: "certification-workflow",
        title: "Certification Workflow",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 8,
        video: "",
        excerpt: "Complete the final certification process to lock competition results.",
        content: `
## Certification Prerequisites

### Required Conditions
- [ ] All performances timed and durations recorded
- [ ] All judge scores submitted and certified
- [ ] Score verification completed against physical records
- [ ] All penalties reviewed and applied correctly
- [ ] No outstanding verification discrepancies
- [ ] Chief judge approval obtained for all adjustments

### Documentation Checklist
- [ ] Timing logs complete and accurate
- [ ] Score verification records signed
- [ ] Penalty applications documented
- [ ] Any adjustments approved and recorded
- [ ] Chief judge sign-off obtained

## Certification Process

### Step 1: Access Certification
1. Navigate to **"Certification"** tab in your dashboard
2. Select the sub-event ready for certification
3. Review the certification checklist
4. Confirm all prerequisites are met

### Step 2: Final Review
**Comprehensive Check**:
- Verify all contestant performances are timed
- Confirm judge certifications are complete
- Review penalty applications and adjustments
- Check score verification completion
- Validate mathematical calculations

### Step 3: Generate Summary Report
- **Timing Summary**: All performance durations
- **Score Overview**: Final scores for all contestants
- **Penalty Report**: All applied penalties and reasons
- **Verification Status**: Confirmation of accuracy checks
- **Discrepancy Log**: Any issues found and resolved

### Step 4: Digital Signature
- **Review Statement**: Read certification declaration
- **Legal Acknowledgment**: Confirm understanding of responsibility
- **Signature Capture**: Draw signature on digital pad
- **Timestamp**: Automatic date and time recording

### Step 5: Submit Certification
- **Final Confirmation**: Click "Certify Results"
- **System Lock**: Results become unchangeable
- **Notification**: Automatic alerts to organiser and contestants
- **Archive Creation**: Complete record preservation

## What Happens After Certification

### Immediate Effects
- **Result Lock**: Scores cannot be modified
- **Public Access**: Results available to contestants
- **Certificate Generation**: Automatic award creation
- **Notification System**: Email alerts sent to all parties

### Data Preservation
- **Complete Archive**: All timing, scoring, and verification data
- **Audit Trail**: Full history of all actions and decisions
- **Backup Storage**: Secure long-term data preservation
- **Export Options**: Data available for external systems

## Post-Certification Responsibilities

### Communication Management
- **Contestant Updates**: Inform participants of result availability
- **Judge Notifications**: Confirm certification completion
- **Organiser Reports**: Provide final documentation
- **Media Coordination**: Support result announcements

### Documentation Finalization
- **Physical Records**: Secure paper documents
- **Digital Backups**: Ensure all data is preserved
- **Certificate Distribution**: Manage award delivery
- **Feedback Collection**: Gather post-event input

## Handling Certification Issues

### Incomplete Prerequisites
- **Missing Scores**: Contact judges for completion
- **Verification Gaps**: Complete outstanding checks
- **Penalty Issues**: Resolve any outstanding disputes
- **Chief Judge Delay**: Coordinate for final approval

### Technical Problems
- **System Access**: Ensure stable internet connection
- **Signature Issues**: Clear and redraw if needed
- **Data Corruption**: Use backup records if available
- **Timing Errors**: Correct any final timing issues

### Legal Considerations
- **Signature Validity**: Ensure proper digital signature
- **Record Completeness**: All required documentation present
- **Compliance Check**: Verify all rules were followed
- **Liability Coverage**: Certification provides legal protection

## Certification Best Practices

### Preparation Excellence
- **Thorough Reviews**: Don't rush final verification
- **Team Coordination**: Work with chief judge and organiser
- **Documentation**: Keep detailed records of all decisions
- **Backup Plans**: Have contingency procedures ready

### Quality Assurance
- **Final Verification**: Double-check all critical data
- **Consistency Review**: Ensure uniform application of rules
- **Stakeholder Communication**: Keep all parties informed
- **Professional Standards**: Maintain integrity throughout

### Risk Management
- **Contingency Planning**: Prepare for technical issues
- **Escalation Procedures**: Know when to involve organisers
- **Documentation Standards**: Maintain complete audit trails
- **Ethical Considerations**: Ensure fair and honest certification

## Advanced Certification Features

### Multi-Tabulator Coordination
- **Role Assignment**: Clear responsibilities in multi-person teams
- **Communication Protocols**: Coordinated certification processes
- **Quality Control**: Cross-verification between tabulators
- **Unified Reporting**: Consolidated certification documentation

### Integration Capabilities
- **External Systems**: Connect with registration or scoring software
- **API Integration**: Automated data transfer
- **Custom Reporting**: Tailored certification reports
- **Archival Systems**: Long-term record preservation

> **Important:** Certification is a serious legal and ethical responsibility. Take time to ensure all data is accurate and all processes have been followed before applying your digital signature.
`,
    },
    // ── Contestant ────────────────────────────────────
    {
        slug: "contestant-registration-guide",
        title: "Contestant Registration Guide",
        category: "Contestant",
        categorySlug: "contestant",
        order: 4,
        video: "",
        excerpt: "Complete step-by-step guide to registering for competitions.",
        content: `
## Finding Competitions

### Discovery Methods
1. **Public Events Page**: Browse all available competitions
2. **Search & Filters**: Find by date, location, or type
3. **Direct Links**: Follow shared competition URLs
4. **Email Invitations**: Registration links from organisers

### Competition Research
**Essential Information to Check**:
- Registration deadlines and fees
- Age and eligibility requirements
- Competition categories and sub-events
- Judging criteria and scoring method
- Schedule and venue details

## Account Setup

### Creating Your Account
1. Visit the competition registration page
2. Click **"Register"** or **"Create Account"**
3. Provide email and create password
4. Verify email address
5. Complete basic profile information

### Profile Requirements
- **Full Legal Name**: As it appears on ID
- **Contact Information**: Phone and emergency contacts
- **Date of Birth**: For age category verification
- **Basic Bio**: Personal introduction

## Registration Process

### Step 1: Competition Selection
- Choose your competition from available options
- Review eligibility requirements
- Check registration fees and deadlines
- Select desired sub-events/categories

### Step 2: Personal Information
**Required Details**:
- Full name and contact information
- Date of birth and age category
- Emergency contact details
- Current location/address

**Optional Information**:
- Personal bio and background
- Social media profiles
- Performance experience
- Special accommodations needed

### Step 3: Media Upload
**Profile Photo**:
- Professional headshot
- Clear, high-quality image
- Appropriate for competition context
- Maximum file size: 5MB

**Additional Media**:
- Performance videos (YouTube/Vimeo links)
- Portfolio photos
- Demo reels or showcases
- Supporting documentation

### Step 4: Sub-Event Selection
- Review available categories
- Select appropriate sub-events
- Check for prerequisites
- Note any additional fees

### Step 5: Agreements & Signatures
**Required Agreements**:
- Competition rules acknowledgment
- Liability waiver
- Media release permission
- Code of conduct agreement

**Digital Signatures**:
- Draw signature on provided pad
- Can clear and redraw if needed
- Legally binding agreements
- Stored securely for records

### Step 6: Payment Processing
**Payment Options**:
- Credit/debit cards
- Digital wallets (PayPal, Apple Pay)
- Bank transfers for large amounts
- Installment plans (if available)

**Fee Structure**:
- Base registration fee
- Per sub-event fees
- Late registration penalties
- Processing fees

### Step 7: Confirmation & Next Steps
**Post-Registration**:
- Receive confirmation email
- Status shows as "Pending Review"
- Access to contestant dashboard
- Updates on approval status

## Registration Management

### Status Tracking
- **Pending**: Awaiting organiser review
- **Approved**: Accepted to compete
- **Rejected**: Not selected (with feedback)
- **Waitlisted**: Backup position
- **Cancelled**: Registration withdrawn

### Editing Registration
**Before Approval**:
- Update personal information
- Change sub-event selections
- Modify media uploads
- Add additional details

**After Approval**:
- Limited editing capabilities
- Contact organiser for major changes
- Some fields become locked

### Multiple Registrations
- Register for multiple competitions
- Manage separate applications
- Track different deadlines
- Organize competition schedules

## Special Registration Scenarios

### Group Registrations
- Team or group applications
- Designated team leader
- Individual member management
- Group fee structures

### Minor Registrations
- Guardian/parent information required
- Additional consent forms
- Age-appropriate content guidelines
- Supervised participation rules

### International Registrations
- Currency conversion for fees
- Visa/travel requirements
- Language considerations
- Time zone coordination

## Troubleshooting Registration

### Common Issues
- **Form Won't Submit**: Check required fields, file sizes
- **Payment Declined**: Verify card details, try different method
- **Email Not Received**: Check spam folder, verify address
- **Login Problems**: Reset password, clear browser cache

### Getting Help
- **Help Center**: Search for registration guides
- **Contact Organiser**: Direct support for specific competitions
- **Technical Support**: Platform-related issues
- **Community Forums**: User experiences and solutions

> **Tip:** Start the registration process early to avoid last-minute technical issues. Prepare all required documents and media in advance for a smooth submission.
`,
    },
    {
        slug: "building-competition-profile",
        title: "Building Your Competition Profile",
        category: "Contestant",
        categorySlug: "contestant",
        order: 5,
        video: "",
        excerpt: "Create a compelling profile that showcases your talents and personality.",
        content: `
## Profile Strategy

### Understanding Profile Purpose
- **First Impression**: Judges' initial view of you
- **Decision Factor**: Influences selection and scoring
- **Audience Engagement**: Attracts fans and voters
- **Professional Record**: Builds your competition history

### Target Audience Analysis
- **Judges**: Look for talent, skill, professionalism
- **Audience**: Seek entertainment, relatability, inspiration
- **Organisers**: Value commitment, preparation, marketability
- **Sponsors**: Consider commercial appeal and brand fit

## Essential Profile Elements

### Professional Headshot
**Requirements**:
- High-resolution image (at least 1000x1000px)
- Neutral background (white, gray, or blue)
- Professional attire appropriate to competition
- Clear facial expression, good lighting

**Best Practices**:
- Recent photo (within 6 months)
- Natural smile and confident posture
- Well-groomed appearance
- Consistent with your performance style

### Personal Biography
**Structure**:
- **Introduction**: Hook with interesting fact
- **Background**: Education, experience, achievements
- **Motivation**: Why you compete, what drives you
- **Personality**: Unique qualities and interests

**Writing Tips**:
- Keep under 300 words
- Use first person, conversational tone
- Include specific achievements
- Show passion and authenticity

### Performance Media
**Video Content**:
- **Demo Reel**: 2-3 minute showcase of your talent
- **Full Performance**: Complete routine or piece
- **Behind-the-Scenes**: Preparation and process
- **Testimonials**: Others speaking about your talent

**Photo Gallery**:
- **Action Shots**: Performing or in motion
- **Professional Portraits**: Various expressions
- **Candid Moments**: Show personality
- **Preparation Images**: Backstage or practice

## Advanced Profile Features

### Social Media Integration
**Platform Selection**:
- Instagram, TikTok for visual talent
- YouTube for performance videos
- Twitter for personality and updates
- Facebook for community engagement

**Content Strategy**:
- Regular posting of progress
- Behind-the-scenes content
- Fan engagement posts
- Professional milestone sharing

### Portfolio Development
**Digital Assets**:
- High-quality performance recordings
- Professional photography
- Press clippings and reviews
- Award certificates and recognitions

**Organization**:
- Categorize by type (video, photo, documents)
- Update regularly with new content
- Backup important files
- Share appropriate content publicly

## Profile Optimization

### SEO & Discoverability
- **Keywords**: Include relevant search terms
- **Complete Fields**: Fill all profile sections
- **Regular Updates**: Keep information current
- **Cross-Platform Consistency**: Use same bio everywhere

### Audience Engagement
- **Storytelling**: Share your journey
- **Transparency**: Be authentic and real
- **Community Building**: Engage with followers
- **Value Addition**: Provide useful content

## Privacy & Security

### Profile Visibility Settings
- **Public**: Visible to all visitors
- **Judges Only**: Restricted to competition staff
- **Private**: Only you can view
- **Custom**: Specific sharing permissions

### Data Protection
- **Personal Information**: Control what you share
- **Media Permissions**: Choose sharing settings
- **Contact Preferences**: Manage communication options
- **Account Security**: Strong passwords, privacy settings

## Profile Maintenance

### Regular Updates
- **Content Refresh**: Update media every 3-6 months
- **Achievement Addition**: Add new awards and experiences
- **Bio Refinement**: Improve writing over time
- **Analytics Review**: Track profile performance

### Performance Tracking
- **View Analytics**: See profile views and engagement
- **Feedback Integration**: Use judge comments for improvement
- **Goal Setting**: Set targets for profile enhancement
- **Progress Monitoring**: Track development over time

## Profile Showcases

### Competition-Specific Profiles
- **Pageants**: Emphasize poise, confidence, community involvement
- **Talent Shows**: Highlight performance skills and versatility
- **Speech Contests**: Showcase communication and persuasion abilities
- **Sports Competitions**: Demonstrate athletic achievements and dedication

### Professional Development
- **Career Building**: Use competitions for professional advancement
- **Networking**: Connect with industry professionals
- **Branding**: Develop personal brand through competitions
- **Portfolio Growth**: Build comprehensive professional portfolio

> **Tip:** Your profile is your first impression. Invest time in creating high-quality content that authentically represents your talents and personality. A strong profile can significantly impact your competition success.
`,
    },
    {
        slug: "competition-day-success",
        title: "Competition Day Success",
        category: "Contestant",
        categorySlug: "competition-day-success",
        order: 6,
        video: "",
        excerpt: "Maximize your performance on competition day with preparation and strategy.",
        content: `
## Pre-Competition Preparation

### Arrival & Check-In
**Timing**:
- Arrive 1-2 hours before your scheduled time
- Allow buffer for traffic, parking, registration
- Check-in opens 30-60 minutes before start

**Required Items**:
- Government-issued photo ID
- Confirmation documents or wristband
- Performance attire and props
- Personal comfort items (water, snacks, medications)

**Check-In Process**:
1. Present ID and confirmation
2. Receive participant materials
3. Get dressing room assignment
4. Attend mandatory briefing/orientation

### Venue Orientation
**Facility Knowledge**:
- Locate stage, dressing rooms, green room
- Identify entrances, exits, emergency routes
- Find water stations, restrooms, first aid
- Note WiFi access points and charging stations

**Technical Setup**:
- Test sound equipment if needed
- Check lighting and stage conditions
- Verify prop storage and access
- Confirm timing and cue systems

## Mental Preparation

### Performance Mindset
**Positive Visualization**:
- Mentally rehearse successful performance
- Visualize receiving positive feedback
- Practice overcoming potential challenges
- Build confidence through preparation

**Stress Management**:
- Deep breathing exercises
- Positive self-talk and affirmations
- Grounding techniques for anxiety
- Focus on process, not outcome

### Physical Readiness
**Health & Wellness**:
- Adequate sleep the night before
- Proper nutrition and hydration
- Light exercise or warm-up routine
- Rest and recovery as needed

**Voice & Body Care**:
- Vocal warm-ups for speakers/performers
- Physical stretching and preparation
- Wardrobe comfort and functionality
- Emergency supplies (throat lozenges, etc.)

## Backstage Management

### Timing & Transitions
**Schedule Awareness**:
- Know your performance slot precisely
- Allow 15-30 minutes for preparation
- Plan for wardrobe and makeup changes
- Account for travel time between areas

**Waiting Strategies**:
- Use waiting time productively
- Practice or review material
- Stay hydrated and comfortable
- Connect with other contestants appropriately

### Communication Protocols
**Staff Interaction**:
- Respect stage manager authority
- Follow all venue rules and instructions
- Ask questions politely and timely
- Maintain professional demeanor

**Contestant Courtesy**:
- Be considerate of shared spaces
- Respect others' preparation time
- Offer encouragement when appropriate
- Maintain competition integrity

## Performance Execution

### Pre-Performance Routine
**Final Preparation**:
- Complete warm-up routine
- Final costume and makeup check
- Mental preparation and focus
- Prop and equipment verification

**Entrance Strategy**:
- Confident stage presence
- Proper introduction acknowledgment
- Professional positioning
- Ready-to-perform posture

### During Performance
**Technical Excellence**:
- Stay within time limits
- Execute technical requirements
- Handle props and equipment properly
- Maintain performance quality throughout

**Audience Connection**:
- Engage appropriately with audience
- Show personality and charisma
- Respond to audience reactions
- Maintain professional focus

### Post-Performance
**Exit Protocol**:
- Graceful stage exit
- Thank judges and audience if appropriate
- Quick debrief with support team
- Transition to recovery mode

**Immediate Reflection**:
- Note what went well
- Identify improvement areas
- Gather initial feedback
- Prepare for potential callbacks

## Results & Feedback

### Result Timing
**Publication Schedule**:
- Immediate preliminary results
- Official results after judging
- People's Choice voting results
- Final rankings and awards

**Access Methods**:
- Dashboard notifications
- Email announcements
- Public results page
- Social media updates

### Feedback Integration
**Judge Comments**:
- Review detailed feedback carefully
- Identify specific improvement areas
- Note positive reinforcement
- Develop action plan for growth

**Self-Assessment**:
- Compare performance to goals
- Analyze technical execution
- Evaluate audience connection
- Plan future preparation strategies

## Special Situations

### Technical Difficulties
**Equipment Issues**:
- Have backup plans ready
- Adapt performance as needed
- Continue professionally despite problems
- Document issues for organisers

**Timing Problems**:
- Be aware of time limits
- Adapt if running short/long
- Handle gracefully if stopped
- Understand penalty implications

### Health & Safety
**Medical Situations**:
- Know location of medical staff
- Have emergency contacts ready
- Prioritize health over performance
- Follow medical advice immediately

**Environmental Factors**:
- Prepare for weather (outdoor events)
- Handle temperature and comfort issues
- Adapt to venue-specific challenges
- Maintain safety as top priority

## Post-Competition Activities

### Networking & Opportunities
**Professional Connections**:
- Connect with judges and organisers
- Network with other contestants
- Engage with sponsors and media
- Build industry relationships

**Media & Promotion**:
- Share competition experience
- Post about results and feedback
- Engage with competition hashtags
- Build personal brand presence

### Recovery & Reflection
**Physical Recovery**:
- Rest and recuperate
- Address any physical strain
- Maintain health routines
- Schedule follow-up medical care if needed

**Mental Processing**:
- Reflect on entire experience
- Process emotions and feedback
- Set new goals and objectives
- Plan future competition strategy

## Success Metrics

### Performance Evaluation
- **Technical Achievement**: Skill execution quality
- **Artistic Expression**: Creativity and originality
- **Professionalism**: Conduct and preparation
- **Audience Impact**: Engagement and connection

### Personal Growth
- **Skill Development**: Technical improvement
- **Confidence Building**: Performance comfort
- **Network Expansion**: Professional connections
- **Experience Value**: Learning and insights gained

> **Tip:** Treat competition day as a performance in itself. Your preparation, professionalism, and attitude contribute significantly to your overall success and reputation in the competition community.
`,
    },
    {
        slug: "understanding-results-feedback",
        title: "Understanding Results & Feedback",
        category: "Contestant",
        categorySlug: "contestant",
        order: 7,
        video: "",
        excerpt: "Interpret your scores, understand judge feedback, and use insights for growth.",
        content: `
## Results Structure

### Scoring System Overview
**How Scores Work**:
- Multiple judges evaluate each contestant
- Scores based on defined rubric criteria
- Weighted criteria affect final score
- Penalties applied for rule violations

**Score Components**:
- **Individual Criterion Scores**: 1-5 scale per category
- **Weighted Totals**: Criteria importance affects final score
- **Judge Averages**: Combined judge scores
- **Penalties**: Deductions for time or rule violations

### Result Categories
- **Preliminary Rounds**: Initial scoring and advancement
- **Semi-Finals**: Reduced field scoring
- **Finals**: Top contestant evaluations
- **Special Awards**: Category-specific recognitions
- **People's Choice**: Audience voting results

## Accessing Your Results

### Result Publication
**Timing**:
- Immediate after performance (preliminary)
- End of round (official scores)
- Competition conclusion (final results)
- Post-certification (complete rankings)

**Access Methods**:
- Dashboard notifications
- Email with result links
- Public results page
- Social media announcements

### Score Breakdown
**Detailed View**:
- Individual judge scores per criterion
- Your average scores vs. competition
- Judge comments and feedback
- Placement ranking information

## Understanding Judge Feedback

### Feedback Types
**Quantitative Feedback**:
- Numerical scores (1-5 scale)
- Criterion-specific ratings
- Overall ranking position
- Statistical comparisons

**Qualitative Feedback**:
- Written comments from judges
- Specific strengths highlighted
- Areas for improvement identified
- Performance suggestions provided

### Reading Between the Lines
**Score Interpretation**:
- **High Scores (4-5)**: Exceptional performance in that area
- **Medium Scores (2-3)**: Solid performance with room for growth
- **Low Scores (1)**: Significant improvement needed
- **Consistency**: How scores align across judges

**Comment Analysis**:
- **Specific Praise**: What judges valued most
- **Constructive Criticism**: Actionable improvement areas
- **Technical Notes**: Performance execution feedback
- **Artistic Feedback**: Style and presentation notes

## Using Feedback for Growth

### Immediate Action Items
**Short-term Improvements**:
- Address specific technical issues
- Work on highlighted weak areas
- Practice suggested techniques
- Refine performance elements

**Practice Strategies**:
- Daily skill development exercises
- Video recording and self-analysis
- Professional coaching sessions
- Performance refinement drills

### Long-term Development
**Career Planning**:
- Identify signature strengths
- Develop unique performance style
- Build comprehensive skill set
- Create professional development roadmap

**Goal Setting**:
- Specific performance objectives
- Timeline for skill mastery
- Competition advancement targets
- Professional milestone planning

## Comparative Analysis

### Benchmarking Performance
**Internal Comparison**:
- Your scores vs. personal bests
- Performance trends over time
- Strength/weakness patterns
- Improvement velocity tracking

**External Comparison**:
- Your ranking vs. competition field
- Score distribution analysis
- Judge consensus evaluation
- Market position assessment

### Statistical Insights
**Performance Metrics**:
- Average score across all criteria
- Score variance between judges
- Criterion-specific performance
- Overall competition percentile

## Handling Different Outcomes

### Success Scenarios
**Winning Experience**:
- Celebrate achievements appropriately
- Express gratitude to supporters
- Share success story strategically
- Leverage momentum for next goals

**Strong Performance**:
- Acknowledge accomplishment
- Identify what contributed to success
- Maintain performance standards
- Build on winning strategies

### Learning from Challenges
**Lower Placement**:
- Focus on feedback over ranking
- Identify specific improvement areas
- Develop targeted practice plans
- Maintain positive growth mindset

**Unexpected Results**:
- Seek additional feedback if needed
- Analyze performance objectively
- Consider external factors
- Focus on controllable improvements

## Feedback Integration

### Action Planning
**Specific Goals**:
- Break feedback into actionable items
- Set measurable improvement targets
- Create practice schedules
- Track progress systematically

**Skill Development**:
- Technical skill refinement
- Performance technique improvement
- Mental preparation enhancement
- Professional presentation development

### Professional Development
**Coaching & Training**:
- Work with performance coaches
- Attend workshops and masterclasses
- Seek mentorship opportunities
- Join professional development programs

**Resource Utilization**:
- Online learning platforms
- Professional organization membership
- Performance libraries and archives
- Industry publication study

## Building Resilience

### Mental Preparation
**Growth Mindset**:
- View feedback as opportunity
- Embrace constructive criticism
- Focus on controllable factors
- Celebrate effort and improvement

**Emotional Management**:
- Process competition emotions
- Maintain perspective on results
- Build competition confidence
- Develop coping strategies

### Long-term Perspective
**Career Development**:
- Treat each competition as learning
- Build comprehensive performance portfolio
- Develop professional network
- Create sustainable growth plan

**Personal Growth**:
- Develop competition resilience
- Build performance confidence
- Enhance professional skills
- Create meaningful competition journey

> **Tip:** Treat feedback as a gift. Every judge comment provides specific insights for improvement. Focus on the actionable intelligence rather than just the ranking numbers.
`,
    },
    {
        slug: "contestant-community-engagement",
        title: "Contestant Community Engagement",
        category: "Contestant",
        categorySlug: "contestant",
        order: 8,
        video: "",
        excerpt: "Build relationships, network, and engage with the competition community.",
        content: `
## Community Understanding

### Competition Ecosystem
**Key Stakeholders**:
- **Fellow Contestants**: Peers in your competitive journey
- **Judges & Staff**: Competition professionals and experts
- **Audience Members**: Fans, supporters, and voters
- **Organisers & Sponsors**: Event creators and supporters
- **Media & Press**: Coverage and promotion professionals

### Community Benefits
- **Support Network**: Encouragement and shared experiences
- **Learning Opportunities**: Knowledge sharing and skill development
- **Professional Connections**: Industry relationships and opportunities
- **Motivation**: Inspiration from others' journeys
- **Collaboration**: Group projects and joint initiatives

## Networking Strategies

### Pre-Competition Networking
**Digital Engagement**:
- Follow competition social media accounts
- Join contestant Facebook groups or forums
- Connect with other contestants online
- Research judges and organisers

**Initial Outreach**:
- Introduce yourself professionally
- Share your background and excitement
- Ask appropriate questions
- Show genuine interest in others

### Competition Day Networking
**Backstage Interactions**:
- Respect personal preparation time
- Offer appropriate encouragement
- Share light conversation when suitable
- Maintain professional boundaries

**Post-Performance Connections**:
- Congratulate fellow contestants
- Share feedback experiences
- Discuss performance challenges
- Exchange contact information

## Professional Relationships

### Judge Interactions
**Appropriate Engagement**:
- Professional respect and courtesy
- Thank judges for their time and expertise
- Listen to feedback attentively
- Maintain appropriate boundaries

**Long-term Connections**:
- Connect on professional networking sites
- Attend judge workshops or seminars
- Seek mentorship opportunities
- Build professional relationships

### Organiser Relationships
**Communication Guidelines**:
- Use official communication channels
- Be professional and respectful
- Express appreciation for their work
- Provide constructive feedback

**Ongoing Engagement**:
- Attend organiser events and workshops
- Volunteer for future competitions
- Provide testimonials and references
- Stay connected for opportunities

## Social Media Strategy

### Platform Selection
**Competition-Appropriate Platforms**:
- **Instagram**: Visual talent showcase
- **TikTok**: Short performance clips
- **YouTube**: Full performance videos
- **Twitter**: Competition updates and networking
- **Facebook**: Community groups and discussions

### Content Strategy
**Pre-Competition**:
- Share preparation journey
- Post motivation and inspiration
- Connect with competition hashtags
- Engage with other contestants' content

**During Competition**:
- Live updates (appropriate level)
- Behind-the-scenes content
- Performance teasers
- Community engagement posts

**Post-Competition**:
- Share results and feedback
- Thank supporters and organizers
- Reflect on experience
- Share growth and lessons learned

## Community Building

### Online Communities
**Contestant Groups**:
- Join competition-specific forums
- Participate in discussion threads
- Share experiences and advice
- Support fellow contestants

**Professional Networks**:
- Join industry association groups
- Attend virtual networking events
- Participate in professional forums
- Connect with mentors and coaches

### Local Engagement
**Regional Groups**:
- Join local competition communities
- Attend regional events and workshops
- Participate in group activities
- Build local support network

**Alumni Networks**:
- Connect with past contestants
- Attend alumni events
- Share experiences and advice
- Build long-term relationships

## Mentorship & Support

### Finding Mentors
**Mentor Identification**:
- Past competition winners
- Industry professionals
- Experienced judges
- Successful alumni

**Mentorship Approach**:
- Research potential mentors
- Craft professional introduction
- Clearly state your goals
- Respect their time and expertise

### Being a Mentor
**Supporting Others**:
- Share your experiences openly
- Provide encouragement and advice
- Help newcomers navigate competitions
- Create positive community culture

## Event Volunteering

### Volunteer Opportunities
**Competition Roles**:
- Event setup and breakdown
- Registration assistance
- Audience management
- Hospitality support

**Benefits**:
- Gain behind-the-scenes knowledge
- Network with organisers and staff
- Contribute to competition community
- Build resume and experience

## Professional Development

### Skill Building
**Community Learning**:
- Attend workshops and seminars
- Participate in masterclasses
- Join study groups
- Share resources and knowledge

**Collaborative Projects**:
- Group practice sessions
- Joint performance projects
- Community service initiatives
- Professional development programs

## Community Guidelines

### Professional Conduct
**Respect & Courtesy**:
- Treat all community members with respect
- Maintain professional communication
- Honor competition integrity
- Support positive community culture

**Ethical Standards**:
- Avoid inappropriate discussions
- Respect privacy and confidentiality
- Maintain competition fairness
- Report concerning behavior appropriately

### Digital Etiquette
**Online Interactions**:
- Use appropriate language and tone
- Respect platform community guidelines
- Protect personal and others' privacy
- Contribute positively to discussions

**Content Sharing**:
- Obtain permission for sharing others' content
- Respect intellectual property rights
- Maintain professional online presence
- Use social media responsibly

## Measuring Engagement Success

### Personal Metrics
- **Network Size**: Professional connections made
- **Opportunities Created**: Auditions, jobs, collaborations
- **Knowledge Gained**: Skills and insights learned
- **Community Impact**: Positive contributions made

### Relationship Quality
- **Mentorship Connections**: Meaningful guidance relationships
- **Collaborative Projects**: Successful joint initiatives
- **Professional Opportunities**: Career advancement results
- **Community Recognition**: Positive community standing

> **Tip:** Community engagement is about building genuine relationships, not just collecting contacts. Focus on being helpful, supportive, and professionally respectful to create lasting, valuable connections in the competition community.
`,
    },
    // ── Tabulator ─────────────────────────────────────
    {
        slug: "tabulator-dashboard",
        title: "Tabulator Dashboard",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 1,
        video: "",
        excerpt: "Overview of the tabulator's workspace and responsibilities.",
        content: `
## Your Workspace

The Tabulator Dashboard is your command centre for managing performance timing, score verification and result certification.

![Tabulator dashboard](/help-images/tabulator/dashboard.png)

## Key Sections

### Contestant Table
Lists all approved contestants for the selected sub-event. The currently performing contestant is highlighted with an **On Stage** badge.

### Performance Timer
Control the timer for each contestant's performance:
- **Start** — begin timing
- **Pause** — temporarily stop (e.g. for interruptions)
- **Stop** — end the performance and record duration

### Score Summary
View a side-by-side comparison of all judges' scores for each contestant after scoring is complete.

> **Tip:** Select a contestant from the pill selector above the timer to automatically highlight them in the table.
`,
    },
    {
        slug: "timing-performances",
        title: "Timing Performances",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 2,
        video: "",
        excerpt: "Start, pause and stop the performance timer for each contestant.",
        content: `
## Selecting a Contestant

Choose the contestant who is about to perform from the **contestant selector** above the timer. Their row in the table will be highlighted.

## Timer Controls

1. Click **Start** when the performance begins
2. Use **Pause** if there's an interruption
3. Click **Stop** when the performance ends

![Timer controls](/help-images/tabulator/timer-controls.png)

## Duration Recording

When you stop the timer, the duration is automatically saved. This duration is used to calculate any **time penalties** based on the competition's penalty rules.

## Penalty Calculation

The system compares the recorded duration against the penalty rules:
- **Grace period** — no penalty within this window
- **Penalty brackets** — points deducted per time range exceeded

> **Tip:** The timer syncs in real-time with judges' read-only timer view, so they can see elapsed time during the performance.
`,
    },
    {
        slug: "certifying-results",
        title: "Certifying Results",
        category: "Tabulator",
        categorySlug: "tabulator",
        order: 3,
        video: "",
        excerpt: "Verify scores, compare digital vs physical records and certify.",
        content: `
## Verification Checklist

Before certifying results, complete these checks:

1. **All contestants scored** — ensure every judge has submitted scores for every contestant
2. **Score review** — compare the digital scores against any physical score sheets
3. **Penalty review** — verify time penalties are correctly applied
4. **Discrepancy check** — note any discrepancies between digital and physical records

## Digital vs Physical Match

Toggle the **Digital vs Physical Match** checkbox to confirm that digital scores align with physical score sheets.

![Certification form](/help-images/tabulator/certification.png)

## Signing Off

Use the signature pad to add your digital signature. Add any discrepancy notes in the text field.

Click **Certify Results** to lock the scores and make them available for publication.

> **Important:** Certification is final. Only an admin can decertify results after this step.
`,
    },
    // ── Contestant ────────────────────────────────────
    {
        slug: "registering-for-events",
        title: "Registering for Events",
        category: "Contestant",
        categorySlug: "contestant",
        order: 1,
        video: "",
        excerpt: "Find a competition and submit your registration application.",
        content: `
## Finding Events

Browse available competitions from the **Events** page. Click on any event to see details including dates, location, rules and rubric.

![Browse events](/help-images/contestant/browse-events.png)

## Starting Registration

Click **Register** on the competition page. You'll need to be signed in to your Scorz account.

## Registration Form

Complete the registration form with:
- **Full name** and contact details
- **Age category** selection
- **Profile photo** upload
- **Bio** — tell judges and audiences about yourself
- **Performance video URL** (optional)
- **Social media handles** (optional)

## Rules Acknowledgement

Read the competition rules and check the acknowledgement box. You may also need to provide a **digital signature**.

![Registration form](/help-images/contestant/registration-form.png)

## Guardian Consent (Minors)

If you're under 18, a guardian must also provide their details and digital signature.

> **Tip:** You can update your profile information after submitting, but changes may need re-approval from the organiser.
`,
    },
    {
        slug: "managing-your-profile",
        title: "Managing Your Profile",
        category: "Contestant",
        categorySlug: "contestant",
        order: 2,
        video: "",
        excerpt: "Update your photo, bio and social links from your profile page.",
        content: `
## Accessing Your Profile

Click **My Profile** from the dashboard or navigate via the sidebar.

![Contestant profile](/help-images/contestant/profile.png)

## Editable Fields

- **Profile photo** — upload or change your headshot
- **Bio** — update your personal statement
- **Performance video** — add or change your showcase video URL
- **Social handles** — link your Instagram, TikTok, Facebook, etc.
- **Location** — city or region

## Media Gallery

Upload additional photos and videos to your media gallery. These are visible to organisers and can be featured on the public event page.

> **Tip:** A complete profile with a great photo and bio makes a strong first impression on judges and audiences.
`,
    },
    {
        slug: "viewing-feedback",
        title: "Viewing Feedback",
        category: "Contestant",
        categorySlug: "contestant",
        order: 3,
        video: "",
        excerpt: "Access judge comments and People's Choice results after the event.",
        content: `
## Feedback Page

After results are published, navigate to **Feedback** from your dashboard to view:
- **Judge comments** — qualitative feedback from each judge
- **Score breakdown** — your scores per criterion
- **People's Choice votes** — how many audience votes you received

![Feedback page](/help-images/contestant/feedback.png)

## Understanding Your Scores

Each criterion shows your individual score from each judge, the weighted score, and how it compares to the average.

## Post-Event Portal

Some competitions offer a **Post-Event Portal** with additional resources, certificates and media from the event.

> **Tip:** Use judge feedback to improve for your next competition. Specific comments on criteria like "Stage Presence" or "Content" are especially valuable.
`,
    },
    // ── Audience ──────────────────────────────────────
    {
        slug: "browsing-events",
        title: "Browsing Events",
        category: "Audience",
        categorySlug: "audience",
        order: 1,
        video: "",
        excerpt: "Discover upcoming competitions and view event details.",
        content: `
## Public Events Page

Visit the **Events** page to see all upcoming and active competitions. No account is required to browse.

![Public events](/help-images/audience/public-events.png)

## Event Details

Click on any event to view:
- **Description** and dates
- **Levels and sub-events** schedule
- **Contestant list** with photos and bios
- **Sponsors** and social links
- **Rules and rubric** (if published)
- **News updates** from the organiser

## Filtering Events

Use the search bar to find events by name. Events are shown in chronological order with status badges (Upcoming, Active, Completed).

> **Tip:** Bookmark events you're interested in — you can return to view live results and cast votes during the event.
`,
    },
    {
        slug: "buying-tickets",
        title: "Buying Tickets",
        category: "Audience",
        categorySlug: "audience",
        order: 2,
        video: "",
        excerpt: "Purchase tickets for sub-events and check in with your QR code.",
        content: `
## Finding Ticketed Events

On the public event page, sub-events with ticketing show a **Get Tickets** button with the price.

## Purchasing a Ticket

1. Click **Get Tickets** on the sub-event
2. Fill in your **name**, **email** and optional **phone number**
3. Complete payment (if applicable)
4. Receive your ticket with a **QR code** via email

![Ticket purchase](/help-images/audience/buy-ticket.png)

## Your Tickets

View all your tickets from **My Tickets** in the dashboard. Each ticket shows:
- Event name and date
- Ticket number
- QR code for check-in
- Check-in status

## Check-In

Present your QR code at the venue for scanning. The organiser's check-in hub will verify and mark your ticket as used.

> **Tip:** Save your ticket email or take a screenshot of the QR code for easy access at the venue.
`,
    },
    {
        slug: "peoples-choice-voting",
        title: "People's Choice Voting",
        category: "Audience",
        categorySlug: "audience",
        order: 3,
        video: "",
        excerpt: "Cast your vote for your favourite contestant during the event.",
        content: `
## How Voting Works

When an organiser enables People's Choice voting, audience members can vote for their favourite contestant in each sub-event.

![Voting form](/help-images/audience/voting.png)

## Casting Your Vote

1. Navigate to the competition page
2. Click **Vote** on the sub-event with voting enabled
3. Select your favourite contestant
4. Enter your **name** and **email** (and ticket number if required)
5. Submit your vote

## Voting Rules

- **One vote per email** per sub-event
- Some events require a valid **ticket number** to vote
- Voting closes when the organiser disables it

## Results

People's Choice results are announced separately from judge scores. Check the competition's news updates for the winner announcement.

> **Tip:** Attend the event in person for the best experience — you can vote live during performances!
`,
    },
];
/** Get all articles for a category slug */
export function getArticlesByCategory(categorySlug) {
    return helpArticles
        .filter((a) => a.categorySlug === categorySlug)
        .sort((a, b) => a.order - b.order);
}
/** Get a single article by category + slug */
export function getArticle(categorySlug, slug) {
    return helpArticles.find((a) => a.categorySlug === categorySlug && a.slug === slug);
}
/** Get category metadata by slug */
export function getCategoryBySlug(slug) {
    return helpCategories.find((c) => c.slug === slug);
}
