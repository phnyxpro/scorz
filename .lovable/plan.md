

## Streamline Judge Scoring: Auto-save, Signature Flow, and Certify All

### Changes

**1. `src/components/registration/SignaturePad.tsx` — Remove "Confirm Signature" button for type-to-sign**
- Remove the "Confirm Signature" button (lines 232-240)
- Instead, auto-call `onSignature(stampSignature(...))` whenever `typedName` changes (via useEffect), so the signature is ready without an extra click
- The draw mode already auto-confirms on `endDraw`, so this makes both modes consistent

**2. `src/pages/JudgeScoring.tsx` — Auto-save on slider change**
- Add a debounced auto-save effect: when `scores` change and `allScored` is true and not certified, automatically call `handleSave()` after ~1s debounce
- This removes the need for the judge to manually click "Save Draft" after each slider adjustment

**3. `src/pages/JudgeScoring.tsx` — "Certify All" button**
- Compute `allContestantsDrafted`: check if every contestant in `filteredContestants` has a "scored" (but not yet "certified") entry in `scoreStatusMap`
- When true, show a "Certify All Results" button below the Save Draft / Certify & Lock row
- Clicking opens a "Certify All" dialog with the same signature pad + checkbox, then loops through all uncertified scores calling `certify.mutateAsync` for each

**4. `src/pages/JudgeScoring.tsx` — Certify dialog simplification**
- The "Certify Scorecard" button now works with the signature provided by the pad (no separate confirm step needed since SignaturePad will auto-emit for typed signatures)

### Files changed
- `src/components/registration/SignaturePad.tsx` — remove Confirm Signature button, auto-emit typed signature
- `src/pages/JudgeScoring.tsx` — add auto-save debounce, add Certify All button + dialog

