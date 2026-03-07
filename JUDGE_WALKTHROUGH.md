# Judge & Chief Judge Walkthrough Guide

Welcome to the Scorz judging system! This guide covers everything judges and chief judges need to know about their roles, access, and responsibilities in competitions.

---

## Table of Contents

1. [Judge Access & Assignment](#judge-access--assignment)
2. [Judge Dashboard](#judge-dashboard)
3. [Judge Scoring Process](#judge-scoring-process)
4. [Chief Judge Dashboard](#chief-judge-dashboard)
5. [Chief Judge Responsibilities](#chief-judge-responsibilities)
6. [Features & Tools](#features--tools)
7. [Common Tasks](#common-tasks)
8. [Tips & Best Practices](#tips--best-practices)

---

## Judge Access & Assignment

### How Judges Are Added to Competitions

Judges are assigned to specific sub-events within a competition by administrators or event organizers. Each judge receives:

- **Role**: Designated as a "Judge"
- **Assignment Scope**: One or more sub-events (e.g., "Speech - Intermediate Level", "Technical Presentation - Advanced")
- **Chief Judge Flag** (optional): Some judges are designated as Chief Judges with additional oversight responsibilities

### Getting Access

1. **Registration**: Ensure your account exists in the system with the "Judge" role
2. **Assignment**: The competition organizer will assign you to specific sub-events and their levels
3. **First Login**: Upon first login as a judge, you'll be directed to the Judge Dashboard

### What If You Don't See Your Assignments?

- Check with your competition organizer
- Verify your email is registered in the system
- Refresh the page or log out and back in
- Contact support if issues persist

---

## Judge Dashboard

The Judge Dashboard is your central hub for all judging activities.

### Accessing the Dashboard

After logging in with a judge account, you'll automatically be taken to `/judge-dashboard` or can select "Judge Dashboard" from the navigation menu.

### Dashboard Overview

**Header Section**
- Title: "Judge Dashboard" with a star icon
- Welcome message: Shows the number of competitions you're assigned to
- Quick stats: "You have assignments in X competition(s)"

**Main Content Area**

The dashboard displays a card for each competition you're assigned to. Each competition card includes:

#### Competition Information
- **Competition Name**: The name of the competition
- **Badge**: Indicates it's a "Competition" assignment
- **Quick Links** (buttons):
  - 📄 **Rules**: View competition rules and guidelines
  - ℹ️ **Rubric**: View the scoring rubric/criteria
  - ⏱️ **Penalties**: View time limit and grace period rules

#### Sub-Events
Below the quick links, you'll see individual cards for each sub-event you're assigned to within that competition:

**Sub-Event Card Details**:
- **Sub-Event Name**: e.g., "Speech Case - Intermediate"
- **Level**: The competition level (Beginner, Intermediate, Advanced, etc.)
- **Status Badge**: 
  - Shows if you're a Chief Judge (if applicable)
  - Indicates scoring status for that sub-event
- **Action Button**: "Start Scoring" or "Continue Scoring" button

### Sub-Event Information Panel

When you click on a sub-event, you can see:
- Number of contestants in the event
- Your role (Judge or Chief Judge)
- Scoring progress (how many competitors have been scored)
- Last activity timestamp

### No Assignments?

If you see "No Assignments" message with a trophy icon:
- You haven't been assigned to any sub-events yet
- Contact the competition organizer
- Check back later as assignments may be added

---

## Judge Scoring Process

### Starting to Score

1. From the Judge Dashboard, click **"Start Scoring"** on your assigned sub-event
2. You'll be taken to the Judge Scoring interface
3. Select the level and sub-event from dropdowns if not already selected

### Scoring Interface Layout

The scoring page is divided into several sections:

#### Left Sidebar (Contestant List) - *Collapsible on Mobile*

**Contestant Selection Area**:
- Dropdown menu showing all contestants for the selected sub-event
- Status indicators for each contestant:
  - **Scored** (grey badge): You've entered preliminary scores
  - **Certified** (green badge): You've finalized and signed off
  - **Not Scored** (no badge): Awaiting your evaluation
- Click a contestant to select them for scoring

#### Main Scoring Area

**Contestant Header**:
- Contestant's name and identification
- Navigation arrows to move between contestants
- Current scoring status

**Rubric Criteria Section**:

Each criterion in the competition's rubric is displayed as:
- **Criterion Name**: What is being evaluated (e.g., "Content Accuracy", "Delivery", "Engagement")
- **Description**: Details about what constitutes quality in this area
- **Score Slider**: Interactive slider to set a score
  - Minimum to maximum points as defined
  - Visual indication of current selection
  - Point value displayed numerically

**Performance Timer** (if configured):
- Visual timer showing elapsed time
- Shows configured time limit
- Displays grace period (if applicable)
- Changes color as time approaches limits

**Comments Section** (if configured):
- Text area for detailed notes about the performance
- Can include strengths, areas for improvement, specific observations
- Help you remember your reasoning later

#### Bottom Controls

**Save Button**:
- Saves your scoring without finalizing
- Can be revisited and modified before certification
- Shows confirmation toast when saved

**Certify Button** (when ready):
- Finalizes your scores for this contestant
- Opens a certification dialog
- Requires digital signature

### Certification Process

When you click **"Certify"**:

1. **Review Dialog Opens**:
   - Shows all your scores for the contestant
   - Displays comments you've written
   - Confirms you're ready to finalize

2. **Consent Acknowledgment**:
   - Must check a box confirming you've reviewed everything
   - Confirms scores are accurate and fair

3. **Digital Signature**:
   - You'll see a signature pad
   - Use mouse/touch to sign
   - Can clear and try again if needed
   - Your signature proves you've officially submitted scores

4. **Confirmation**:
   - Upon successful certification, a success message appears
   - The contestant's status updates to "Certified"
   - You cannot modify certified scores

### Modifying Scores Before Certification

- Before certifying, you can:
  - Change any criterion score by moving the slider
  - Update comments
  - Add or remove notes
  - Click "Save" to preserve changes
  
- After certification, scores are locked

### Scoring Tips

**Best Practices**:
- Score while the performance is fresh in your mind
- Review the rubric criteria before evaluation
- Write descriptive comments to explain your scoring
- Use the full range of the scale (don't cluster all scores in the middle)
- Be consistent with other judges (compare if visible)
- Follow penalty rules for time violations

**Avoiding Common Mistakes**:
- Don't miss the grace period when timing performances
- Ensure all required criteria are scored (sliders shouldn't be at default)
- Write meaningful comments (not just "good job")
- Double-check scores before certification
- Don't wait until the last minute to score (real-time backups help)

---

## Chief Judge Dashboard

### Chief Judge Role

A Chief Judge has all standard judge responsibilities PLUS additional oversight:

- **Supervise** all judges' scoring for assigned sub-events
- **Review** all submitted scores before they're finalized
- **Adjust** penalty calculations if needed
- **Resolve** tie situations
- **Certify** the sub-event results officially
- **Monitor** judge activity and progress

### Accessing the Chief Judge Dashboard

The Chief Judge Dashboard is similar to the Judge Dashboard but appears when you're designated as Chief Judge for one or more sub-events.

### Chief Judge Dashboard Layout

**Sub-Event Selection**:
- Dropdown to select which sub-event to review
- Filters to show only sub-events where you're Chief Judge

**Main Review Tabs**:

#### 1. **Panel Monitor** Tab
Shows real-time judging activity:
- List of all judges assigned to the sub-event
- Current activity status (actively scoring, idle, etc.)
- Last action timestamp
- Number of contestants each judge has scored/certified
- Progress percentage for each judge

**Benefits**:
- Identify any judges who are falling behind
- Spot activity issues early
- Coordinate scoring schedule

#### 2. **Score Review** Tab
Shows aggregated scores for all contestants:
- **Contestant List**: All competitors in the sub-event
- **Judge Scores**: Side-by-side comparison of scores from each judge
- **Score Consistency**: Visual indication of score variation
  - Green: Judges largely in agreement
  -Yellow: Moderate variation
  - Red: Significant disagreement (may need investigation)

**Actions Available**:
- View each judge's individual score cards
- Review judge comments and notes
- See scoring timestamp from each judge
- Identify outliers or unusual patterns

#### 3. **Penalties Review** Tab
Manage time violations and adjustments:
- List all contestants with time violations
- Original penalty amounts
- Adjustment controls if needed
- Justification fields for any changes

**Your Responsibilities**:
- Review time violation recordings
- Confirm penalty amounts are correct
- Adjust if technical timing errors occurred
- Document reasons for adjustments

#### 4. **Tie Breaker** Tab
Handle competitions where multiple contestants have identical scores:
- Displays tied contestants
- List of available tie-breaker criteria
- Selection interface to designate the winner
- Comments field for explanation

**Process**:
1. System identifies tied scores
2. You review alternate scoring criteria (if defined)
3. Select which contestant prevails (optional)
4. Document the reasoning

#### Scoring Progress Bar
Shows overall completion:
- Visual progress indicator
- Number of contested scored vs. total
- Percentage complete
- Status: "In Progress", "Ready for Certification", etc.

### After all judges submit scores

Once all judges have submitted and certified their scores for all contestants:

1. **Final Certification Button** becomes available
2. You can review the complete Panel Monitor showing 100% judge participation
3. Click **"Certify Sub-Event"** to officially finalize results

### Final Certification Process

**Certification Dialog**:
1. Review that all judges have certified
2. Acknowledge you've reviewed all scores
3. Confirm penalty adjustments are correct
4. Confirm any tie-breaker decisions
5. Add your digital signature
6. Submit to finalize the sub-event

**What Happens After**:
- Results are locked and archived
- Competitors can view their scores
- Reports can be generated
- Results move to tabulation phase

---

## Chief Judge Responsibilities

### Before Scoring Begins

- [ ] Review the rubric criteria with judges
- [ ] Confirm all judges understand the time limits
- [ ] Verify penalty rules are clear
- [ ] Test the scoring interface if judges are unfamiliar
- [ ] Establish communication channel (chat)
- [ ] Set expectations for commenting/notes

### During Scoring

- [ ] Monitor judge progress using Panel Monitor
- [ ] Watch for unusual patterns in Score Review
- [ ] Coordinate if judges want to discuss borderline cases
- [ ] Ensure timers are accurate
- [ ] Document any special circumstances

### After Scoring (Before Certification)

- [ ] Review all submitted scores carefully
- [ ] Check for outlier scores that need discussion
- [ ] Verify penalty calculations
- [ ] Resolve any identified tie-breakers
- [ ] Reach out to judges if scores seem inconsistent
- [ ] Document any adjustments and reasoning

### Certification

- [ ] Final review of all data
- [ ] Complete any remaining tie-breaker decisions
- [ ] Make any final penalty adjustments with documentation
- [ ] Sign and certify the sub-event
- [ ] Ensure scores are locked

### Post-Certification

- [ ] Communicate results to appropriate parties
- [ ] Be available for questions about scoring decisions
- [ ] Preserve documentation for records

---

## Features & Tools

### Communication: Event Chat

**Purpose**: Communicate with other judges, chief judges, and administrators

**Accessing Chat**:
- Look for a **Message icon** 💬 in the dashboard
- Shows unread message count
- Click to open chat panel

**Chat Features**:
- Real-time messaging
- See who's online
- Threaded conversations (optional)
- File sharing capability
- Chat history is logged

**Best Uses**:
- Clarify rubric interpretation
- Discuss borderline scoring cases
- Coordinate timing or scheduling
- Ask quick technical questions
- Share notes on patterns you're noticing

**Communication Tips**:
- Keep messages professional
- Reference specific contestants when discussing
- Avoid discussing other judges' scores in a negative way
- Use chat for quick clarifications, email for formal documentation

### Guidelines & Reference Materials

**Quick Links Available**:
- 📄 **Rules**: Competition-specific rules and guidelines
- ℹ️ **Rubric**: Detailed scoring criteria for all categories
- ⏱️ **Penalties**: Time limits, grace periods, and penalty amounts

**Access**:
- From Judge Dashboard quick links
- Usually links to PDF or detailed description pages
- Can be accessed anytime

**How to Use**:
- Review the full rubric before you start scoring
- Reference rules when you encounter unusual situations
- Check penalties tab before final scoring to understand time calculations

### Real-Time Updates

The system provides live synchronization:
- Your scores are saved in real-time as you work
- If connection is lost, you won't lose progress
- See other judges' activity (Chief Judge only)
- Notifications when judges certify scores

---

## Common Tasks

### Task: Score Your First Contestant

1. Go to Judge Dashboard
2. Click "Start Scoring" on your assigned sub-event
3. From the contestant dropdown, select the first contestant
4. Move the slider for each rubric criterion to set scores
5. Add comments explaining your scoring (optional)
6. Click "Save" to save preliminary scores
7. Click "Certify" when ready to finalize
8. Review in the certification dialog
9. Sign the signature pad
10. Click "Confirm Certification"

### Task: Adjust a Score Before Certification (Judge)

1. In the scoring interface, locate the criterion you need to adjust
2. Move the slider to the new score value
3. Update comments if the reasoning has changed
4. Click "Save"
5. Verify the change was saved
6. Do NOT certify until you're fully ready

### Task: Review Judge Scores (Chief Judge)

1. Go to Chief Judge Dashboard
2. Select the sub-event from dropdown
3. Click on "Score Review" tab
4. Select a contestant from the list
5. Compare scores from each judge
6. Read comments from each judge
7. Note any significant discrepancies
8. Return to contestant list to review others

### Task: Monitor Judge Progress (Chief Judge)

1. On Chief Judge Dashboard
2. Click "Panel Monitor" tab
3. Review the judge list:
   - Green indicators = actively scoring
   - Grey = idle
   - Check last activity time
4. If a judge is delayed, you can message them in chat
5. Update your expectations based on progress

### Task: Adjust a Penalty (Chief Judge)

1. On Chief Judge Dashboard
2. Click "Penalties Review" tab
3. Locate contestant with questionable time violation
4. Click to review original timing
5. If adjustment is needed:
   - Click "Adjust Penalty" button
   - Enter the corrected penalty amount
   - Add justification comment
   - Confirm adjustment
6. Keep documentation for records

### Task: Resolve a Tie-Breaker (Chief Judge)

1. On Chief Judge Dashboard
2. Click "Tie Breaker" tab
3. System shows tied contestants
4. Review available tie-breaker criteria
5. Option 1: Auto-adjustment (if criteria are defined)
6. Option 2: Manual selection
   - Select which contestant prevails
   - Add explanation
7. Confirm and save

### Task: Certify Sub-Event Results (Chief Judge)

**Prerequisites**:
- All judge panels have certified their scores
- All penalties have been reviewed
- All tie-breakers are resolved

**Steps**:
1. Chief Judge Dashboard
2. Ensure all judge progress shows 100%
3. Review Score Review tab once more
4. Click "Certify Sub-Event" button
5. Review confirmation dialog
6. Check final consent checkbox
7. Add your digital signature
8. Click "Confirm Certification"
9. See success message - sub-event is now locked

---

## Tips & Best Practices

### Scoring Best Practices

**Before Evaluation**:
- ✅ Read the complete rubric beforehand
- ✅ Understand the point values for each criterion
- ✅ Know the time limits and grace periods
- ✅ Review previous scores if reference available (without bias)

**During Evaluation**:
- ✅ Take notes during the performance
- ✅ Score immediately after to avoid memory fade
- ✅ Be consistent across multiple contestants
- ✅ Watch the timer if you're responsible for timing
- ✅ Look for both strengths and areas for improvement

**When Scoring**:
- ✅ Consider the full scale of available points
- ✅ Avoid clustering all scores in the middle
- ✅ Be fair and non-biased
- ✅ Grade relative to the rubric, not to other competitors
- ✅ Write meaningful comments explaining your scores

**After Scoring**:
- ✅ Review your comments for clarity
- ✅ Double-check math if there's a score modifier
- ✅ Think about consistency with other performances
- ✅ Only certify when you're genuinely ready
- ✅ Don't second-guess after certification

### Chief Judge Best Practices

**Before Scoring Begins**:
- ✅ Meet with judge team if possible
- ✅ Review the rubric with judges
- ✅ Clarify any ambiguous criteria
- ✅ Set expectations for speed and quality
- ✅ Explain penalty rules
- ✅ Establish communication protocol

**During Active Scoring**:
- ✅ Monitor progress regularly
- ✅ Look for consistency between judges
- ✅ Watch for judges who are struggling
- ✅ Be ready to clarify rubric questions
- ✅ Note any technical issues
- ✅ Keep communication flowing

**During Score Review**:
- ✅ Look at overall patterns first
- ✅ Investigate significant outliers
- ✅ Don't immediately assume errors
- ✅ Check if comments explain variation
- ✅ Review at detail for inconsistencies
- ✅ Document observations

**Special Situations**:
- **Significantly Different Scores**: Check comments; if no clear issue, it may reflect legitimate different interpretations
- **Missed Criteria**: Reach out to judge to understand why
- **Timing Issues**: Review recordings if available
- **Judge Questions**: Clarify immediately to avoid cascading errors
- **Technical Problems**: Alert admin if system issues

### Technology Tips

**Saving Your Work**:
- The system auto-saves constantly
- Always click "Save" button for explicit checkpoint
- You can safely close browser without losing progress
- Even if disconnected, scores persist on device initially

**Signature Pad**:
- If signature looks weird, click "Clear" and try again
- Use smooth, steady strokes
- Your signature proves you've verified the data
- Can't be unsigned once certified

**Mobile/Tablet Scoring**:
- Works well on tablets 
- Use stylus if possible for better precision
- Sidebar collapses to save space
- Landscape orientation recommended for rubric

**Desktop Scoring**:
- Wider screen allows side-by-side layout
- Keep rubric reference open in another window
- Mouse works fine for all controls

### Troubleshooting Common Issues

**Issue**: "I can't see my assignments"
- **Solution**: Verify you're logged in as judge user, refresh page, check with administrator

**Issue**: "Scores won't save"
- **Solution**: Check internet connection, try a different browser, clear cache if needed

**Issue**: "Timer isn't counting down"
- **Solution**: May be display-only (not your responsibility), check tab/role requirements

**Issue**: "I certified by mistake"
- **Solution**: Notify chief judge/admin immediately; they may be able to uncertify if needed

**Issue**: "Comments aren't showing for all judges"
- **Solution**: Comments are optional; not all judges may writeComments

**Issue**: "Can't access Chat"
- **Solution**: Chat may be disabled for this competition; try refreshing or ask organizer

---

## Keyboard Shortcuts & Navigation

While the system is mouse/touch friendly, some useful patterns:

- **Tab between Criteria**: Use Tab key to move between sliders
- **Arrow Keys**: Some dropdowns support arrow key navigation
- **Signature Pad**: Use trackpad for best signature accuracy
- **Mobile Back Button**: Returns to previous page

---

## Contacting Support

If you encounter issues:

1. **In-System**: Look for Help or Support link in footer
2. **Email**: Contact the competition organizer
3. **Chat**: Message tech support if available in competition chat
4. **Direct**: Ask your Chief Judge who may have admin contact

Provide:
- Competition name
- Your name and email
- What you were trying to do
- What went wrong
- Any error messages

---

## Summary

**Key Takeaways**:
- ✅ Judge Dashboard is your home; start there
- ✅ Always review the rubric before scoring
- ✅ Use comments to explain your scoring
- ✅ Save before certifying
- ✅ Signature = final commitment
- ✅ Chief Judges: monitor progress and review comprehensively
- ✅ Communication is key for clarifications
- ✅ Chief Judges certify to lock results

**Judge Workflow**: Assign → Dashboard → View Guidelines → Score → Certify

**Chief Judge Workflow**: Assign → Dashboard → Monitor Judges → Review Scores → Adjust Penalties → Resolve Ties → Certify Sub-Event

---

## Appendices

### A. Glossary of Terms

**Sub-Event**: A specific event category at a particular level (e.g., "Speech - Beginner")
**Level**: Competition tier (Beginner, Intermediate, Advanced, etc.)
**Rubric Criterion**: Individual scoring category evaluated
**Time Limit**: Maximum allowed performance time
**Grace Period**: Extra time allowed before penalties apply
**Certification**: Official sign-off locking in your scores
**Chief Judge**: Lead judge responsible for final review and sign-off
**Penalty**: Points deducted for time violations
**Tie-Breaker**: Process to determine winner when scores are equal
**Panel**: The group of judges evaluating a sub-event

### B. Sample Rubric Criteria

Typical scoring areas (yours may vary):
- **Content Accuracy**: Factual correctness of information
- **Organization**: Logical flow and structure
- **Delivery**: Voice, pacing, clarity, engagement
- **Visual Aids** (if applicable): Quality and effectiveness
- **Q&A Response** (if applicable): Accuracy and thoughtfulness
- **Engagement**: Connection with audience
- **Time Management**: Adherence to time limits

### C. Typical Time Limits

These vary by competition type:
- **Speech Events**: 3-8 minutes + 30-60 second grace period
- **Presentations**: 10-15 minutes + 1 minute grace period
- **Demonstrations**: 5-12 minutes typically
- **Your Competition**: Check the Penalties link for specifics

---

*Last Updated: March 2026*
*For system-specific questions, contact your competition administrator*
