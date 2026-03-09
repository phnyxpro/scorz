

## Plan: Tie-Breaker Overhaul, Certification Notice & Tabulator Witness Label

### Summary
Four changes: (1) Fix tie detection to use `avgFinal` (the calculated final score) instead of the all-judges average, (2) Redesign TieBreaker panel with accordion + drag-to-rank UI, (3) Add a formal certification notice with signature when chief judge certifies, (4) Clarify "Witness" as "2nd Tabulator" in the Tabulator dashboard.

---

### 1. Fix Tie Detection to Use Final Score

**File:** `src/pages/ChiefJudgeDashboard.tsx` (lines 111-137)

Currently, ties are detected by averaging `final_score` across judges per contestant. This should instead use the same `calculateMethodScore()` used in the Level Master Sheet — computing the aggregated final score (Olympic formula with single penalty), then detecting ties on that value.

- Import `calculateMethodScore` from `@/lib/scoring-methods`
- Fetch the competition's `scoring_method` from the `comp` data
- Recompute `contestantAverages` to use `rawTotals` + `timePenalty` → `calculateMethodScore()` producing `avgFinal`, matching the Level Master Sheet logic
- Detect ties on `avgFinal` instead of the per-judge average

### 2. Redesign TieBreaker Component with Accordion + Drag Ordering

**File:** `src/components/chief-judge/TieBreaker.tsx` (full rewrite)

**New UI per tie group:**
- Each tied pair/group shown as a collapsible section header ("Tie at X.XX points")
- Inside: an accordion where each contestant is an item, expandable to show their score breakdown (per-judge raw totals, penalty, final — similar to Level Master Sheet row)
- Contestants within a tie group are **draggable** (using `@dnd-kit/sortable` already installed) to set rank order
- "Lock Tie-Break Decision" button saves the ordering + optional notes

**New props:**
- Add `onSaveTieBreakOrder: (tieBreakOrder: {regId: string; rank: number}[], notes: string) => Promise<void>` 
- Remove criterion-based tie resolution (replace with drag ordering)

**Database:** Add a `tie_break_order` JSONB column to `chief_judge_certifications` to persist the ordered ranking of tied contestants. Migration:
```sql
ALTER TABLE public.chief_judge_certifications 
ADD COLUMN IF NOT EXISTS tie_break_order jsonb DEFAULT '[]'::jsonb;
```

**Hook update:** `src/hooks/useChiefJudge.ts` — add `tie_break_order` to `ChiefJudgeCertification` interface.

**ChiefJudgeDashboard update:** Pass the new callback that saves `tie_break_order` via `upsertCert`. The Level Master Sheet and Master Score Sheet should respect this ordering when ranks are tied.

### 3. Chief Judge Certification Notice with Formal Statement

**File:** `src/pages/ChiefJudgeDashboard.tsx` (certification dialog, lines 462-519)

When the chief judge clicks "Certify Sub-Event", replace the current dialog content with:
- A formal notice at the top: *"I, [Chief Judge Name], certify the results for this level of the competition [Competition Name] on [Date and Time] according to the rubric, rules and regulations stipulated."*
- Fetch the chief judge's name from their profile (already available via `user.user_metadata?.full_name` or a profiles query)
- Include the full `SignaturePad` with "Draw" and "Type to Sign" options (already present)
- Keep the consent checkbox
- Format date/time as readable string (e.g., "March 9, 2026 at 2:30 PM")

After certification is complete, show the certification notice as a banner at the top of the sub-event panel (above the tabs), with the signed statement, signature image, and timestamp.

### 4. Tabulator Dashboard: Clarify Witness as "2nd Tabulator" & Reorder Certification Chain

**File:** `src/pages/TabulatorDashboard.tsx`

- In the certification chain badges (line 169-182): Change the order to Chief Judge → Tabulator → Witness (already in this order, confirmed)
- Change the Witness label/title from "Witness Verification" to "2nd Tabulator / Witness Verification" 
- Update the badge text: "Witness" → "2nd Tabulator (Witness)"
- Move the certification chain badges **above** the Performance Timer (currently they're already above it, but ensure the label clarifies "2nd Tabulator")

---

### Files to Modify
1. `src/pages/ChiefJudgeDashboard.tsx` — fix tie detection, update certification dialog with formal notice
2. `src/components/chief-judge/TieBreaker.tsx` — full redesign with accordion + drag-to-rank
3. `src/hooks/useChiefJudge.ts` — add `tie_break_order` to interface
4. `src/pages/TabulatorDashboard.tsx` — clarify witness as "2nd Tabulator"

### Database Migration
- Add `tie_break_order jsonb DEFAULT '[]'` column to `chief_judge_certifications`

