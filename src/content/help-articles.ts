export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  order: number;
  video: string;
  excerpt: string;
  content: string;
}

export interface HelpCategory {
  slug: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export const helpCategories: HelpCategory[] = [
  { slug: "getting-started", label: "Getting Started", description: "Learn the basics of the Scorz platform", icon: "Rocket" },
  { slug: "organiser", label: "Organiser", description: "Create and manage competitions end-to-end", icon: "Trophy" },
  { slug: "judge", label: "Judge", description: "Score performances and certify scorecards", icon: "ClipboardList" },
  { slug: "tabulator", label: "Tabulator", description: "Time performances, verify scores and certify results", icon: "BarChart3" },
  { slug: "contestant", label: "Contestant", description: "Register, build your profile and view feedback", icon: "User" },
  { slug: "audience", label: "Audience", description: "Browse events, buy tickets and vote", icon: "Users" },
];

export const helpArticles: HelpArticle[] = [
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
export function getArticlesByCategory(categorySlug: string): HelpArticle[] {
  return helpArticles
    .filter((a) => a.categorySlug === categorySlug)
    .sort((a, b) => a.order - b.order);
}

/** Get a single article by category + slug */
export function getArticle(categorySlug: string, slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.categorySlug === categorySlug && a.slug === slug);
}

/** Get category metadata by slug */
export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return helpCategories.find((c) => c.slug === slug);
}
