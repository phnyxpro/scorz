

## Mobile Responsiveness Optimisation — Judge Scoring

### Current Issues
- Header takes up significant vertical space on mobile with badges side-by-side
- CriterionSlider label + number input + "Press 1-5" hint crowd the row on narrow screens
- Criterion descriptions show below slider even on tiny screens, consuming vertical space
- Action buttons ("Save Draft" / "Certify & Lock") are small touch targets
- Certify dialogs have desktop-sized padding
- The sidebar toggle + back button + badges row wraps awkwardly on 390px
- "View Full Rubric" button uses horizontal space for an icon + text

### Changes

**1. `src/pages/JudgeScoring.tsx` — Mobile layout tweaks**
- **Header**: Stack contestant badge below the title row on mobile (`flex-wrap` + full-width badge on `sm:` breakpoint)
- **Action buttons**: Make Save/Certify buttons taller on mobile (`h-12` vs default) for easier touch targets
- **Certify dialogs**: Add `max-h-[90vh] overflow-y-auto` to dialog content for small screens so signature pad doesn't overflow
- **Raw Total card**: Reduce vertical padding on mobile
- **"View Full Rubric" button**: Icon-only on mobile, text on `sm:`+

**2. `src/components/scoring/CriterionSlider.tsx` — Compact mobile layout**
- Hide "Press 1-5" keyboard hint on mobile (it's a desktop shortcut)
- Stack criterion name above the input+slider on very narrow screens using responsive flex direction
- Make the slider thumb larger on touch devices (`h-6 w-6` on mobile) for easier dragging
- Reduce padding from `p-2` to `p-1.5` on mobile

**3. `src/components/ui/slider.tsx` — Larger touch target**
- Increase thumb size on mobile: `h-6 w-6 sm:h-5 sm:w-5` and track height `h-2.5 sm:h-2`

### Files changed
- `src/pages/JudgeScoring.tsx` — responsive header, taller buttons, dialog scroll, compact spacing
- `src/components/scoring/CriterionSlider.tsx` — hide keyboard hint on mobile, reduce padding
- `src/components/ui/slider.tsx` — larger thumb and track for touch

