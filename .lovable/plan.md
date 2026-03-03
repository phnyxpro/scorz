

## Overhaul Judging Navigation and Scoring Interface

This plan restructures the judge/chief-judge experience with a dedicated Rules and Rubric page, reorganized navigation, enhanced slider-based score cards with 0.5 increments, and a streamlined Certify Results flow.

---

### 1. Create Rules and Rubric Page

**New file: `src/pages/RulesAndRubric.tsx`**

A dedicated page at `/competitions/:id/rules-rubric` that displays:
- **Rules section**: Shows the competition's `rules_url` as an embedded link/iframe, plus any competition description text
- **Rubric section**: Reuses the existing `PublicRubric` component to display all scoring criteria with their 1-5 descriptors, plus penalty rules
- Separated into clear sections with headers ("Official Rules" and "Scoring Rubric")

**Route registration in `src/App.tsx`**: Add a protected route for `/competitions/:id/rules-rubric`.

---

### 2. Reorganize Dashboard Navigation Cards

**File: `src/pages/Dashboard.tsx`**

Reorder the `ROLE_CARDS` for `chief_judge` and `judge` roles:

For **judge**:
1. My Assignments (judge-dashboard)
2. Judging Hub (judging)
3. Rules and Rubric (new page link)

For **chief_judge**:
1. My Assignments (judge-dashboard)
2. Judging Hub (judging)
3. Certify Results (chief-judge)
4. Rules and Rubric (new page link)

The "Rules and Rubric" card will link to `/competitions` with a note, since the page is competition-specific. Alternatively, it links to the judge-dashboard where competition context is available.

---

### 3. Upgrade Score Card Slider to 0.5 Increments with Number Input

**File: `src/components/scoring/CriterionSlider.tsx`**

- Change slider `step` from `1` to `0.5`
- Change slider `min` to `0.5` and `max` to `5`
- Add a numeric input field next to the slider that displays and allows direct entry of the score value
- The number input accepts values in 0.5 increments (0.5, 1.0, 1.5, ... 5.0)
- Update the `scoreLabels` to reflect half-point scoring
- The total is auto-calculated from all rubric criteria scores (already works this way)
- Update keyboard shortcuts to still work (1-5 keys set whole numbers, but slider allows half-points)

---

### 4. Enhance Judging Hub with Full Score Cards

**File: `src/pages/JudgingHub.tsx`**

The Judging Hub already shows expandable contestant rows with side-by-side scores. Enhance it so:
- Chief judges can view individual scoring cards per level, per judge, per contestant
- When expanding a contestant row, show each judge's full criterion-level breakdown (already partially implemented via `SideBySideScores`)
- Add a link from each contestant row to open the full score card view
- Ensure levels are tabbed (already implemented) so chief judge can navigate per level

---

### 5. Enhance "My Assignments" (Judge Dashboard)

**File: `src/pages/JudgeDashboard.tsx`**

- Add schedule information (event date, start/end time) to each sub-event card
- Each contestant row already links to the score card -- ensure these links are prominent
- Add a "Rules and Rubric" quick-link button that navigates to the new Rules and Rubric page for the relevant competition

---

### 6. Create "Certify Results" Page for Chief Judge

**File: `src/pages/ChiefJudgeDashboard.tsx`**

This page already exists and handles certification. Enhance it to:
- Include a direct embed/link to the Master Score Sheet for the selected sub-event (already accessible via separate page, add inline view)
- Keep the existing signature/certification flow at the bottom
- Add a summary card showing total contestants, total scores, and certification status before the sign-off

---

### 7. Update Bottom Navigation

**File: `src/components/AppLayout.tsx`**

Update the `bottomNavItems` so judges and chief judges see the navigation in the correct order as described.

---

### Technical Notes

- The slider change from integer to 0.5 steps means `criterion_scores` in the database (JSONB) will store decimal values like 2.5 instead of only integers. The `raw_total` and `final_score` columns are already `numeric` type, so no database migration is needed.
- The `CriterionSlider` component will get a companion `<Input type="number">` for direct numeric entry, synced bidirectionally with the slider.
- All existing score data remains compatible since we're widening the valid range, not changing the data format.

