

## Plan: Standardize Hub Page Layout Wrappers

### Problem
The action card hub pages have inconsistent outer wrappers:
- **With side spacing** (`max-w-4xl mx-auto`): JudgingHub, RegistrationsHub, ResultsHub, ContestantProfilesHub
- **No max-width** (full bleed): FinanceDashboard, TicketsHub, CheckInHub, PeoplesChoiceManager

### Approach
Standardize all hub pages to use the same wrapper pattern. Since several of these pages (TicketsHub, FinanceDashboard) contain wide tables and charts, `max-w-4xl` (56rem / 896px) is too narrow. The better fix is to use a wider constraint like `max-w-6xl mx-auto` across all hub pages, which provides consistent side spacing while accommodating tables and charts.

### Changes

| File | Change |
|------|--------|
| `src/pages/JudgingHub.tsx` | `max-w-4xl mx-auto` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/RegistrationsHub.tsx` | `max-w-4xl mx-auto space-y-6` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/ResultsHub.tsx` | `max-w-4xl mx-auto space-y-6` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/ContestantProfilesHub.tsx` | `max-w-4xl mx-auto space-y-6` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/FinanceDashboard.tsx` | `space-y-6 animate-in…` → `max-w-6xl mx-auto space-y-6 animate-in…` |
| `src/pages/TicketsHub.tsx` | `space-y-6` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/CheckInHub.tsx` | `space-y-6` → `max-w-6xl mx-auto space-y-6` |
| `src/pages/PeoplesChoiceManager.tsx` | `space-y-6` → `max-w-6xl mx-auto space-y-6` |

All pages get `max-w-6xl mx-auto space-y-6` as the standard wrapper, ensuring uniform side spacing.

