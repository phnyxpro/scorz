

## Add Level Master Sheet Link & Results Card to Chief Judge Dashboard

### Changes

#### 1. Chief Judge Dashboard — Add Level Master Sheet link above selectors
In `src/pages/ChiefJudgeDashboard.tsx`, add a link button to the Level Master Sheet above the Level/Sub-Event selector card (around line 250). This uses the same URL pattern as the Tabulator dashboard: `/competitions/:id/level-sheet?level=${selectedLevelId}`. Only show when a level is selected.

#### 2. Judge Dashboard Cards — Add "Results" card
In `src/pages/Dashboard.tsx`, update `buildJudgeCards()` to insert a "Results" card between "Certify Results" and "Contestant Profiles". This card links to `/competitions/:id/results-hub` or similar. However, since the user wants both Level Master Sheet and individual Master Score Sheet access, the card should link to the Level Master Sheet by default: `/competitions/:id/level-sheet`.

Looking at the request more carefully — the user wants a "Results" card on the **judge dashboard** (the card grid on `/dashboard`) that lets them view either the Level Master Sheet or the individual (sub-event) Master Score Sheet. Since dashboard cards are simple link cards, the most practical approach is to link to the existing results page or create a lightweight results hub.

Let me check what `/competitions/:id/results-hub` or similar exists:

Actually, looking at the file list there's `src/pages/ResultsHub.tsx`. Let me verify.

#### Revised approach:

**File 1: `src/pages/ChiefJudgeDashboard.tsx`**
- Above the Level/Sub-Event selector card (~line 250), add a "View Level Master Sheet" link button that navigates to `/competitions/:id/level-sheet?level=${selectedLevelId}`. Show only when `selectedLevelId` is set.

**File 2: `src/pages/Dashboard.tsx`**
- In `buildJudgeCards()`, insert a new "Results" card after "Certify Results" and before "Contestant Profiles":
  ```
  { title: "Results", desc: "Level & sub-event score sheets", icon: BarChart3, color: "text-secondary", to: `/competitions/${competitionId}/level-sheet` }
  ```
  This takes judges to the Level Master Sheet where they can see combined results. The Level Master Sheet page already has level selection via query params.

### Files to modify:
- `src/pages/ChiefJudgeDashboard.tsx` — add Level Master Sheet link above selectors
- `src/pages/Dashboard.tsx` — add Results card to `buildJudgeCards()`

