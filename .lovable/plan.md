

## Add E-Signature & Type-to-Sign Options (Keep Draw)

### Overview
Enhance the existing `SignaturePad` component to offer **two signature methods** via tabs, while keeping the current draw functionality intact. A digital metadata stamp will be appended to all signatures.

### Approach
Modify `SignaturePad.tsx` directly -- no new file needed. Add a `Tabs` toggle between **Draw** and **Type** modes. The "E-Sign" concept (one-click consent with typed name) is folded into the Type tab as the simplest UX. All outputs include a metadata footer stamp.

### Component Changes (`src/components/registration/SignaturePad.tsx`)

**New props:**
```ts
interface SignaturePadProps {
  onSignature: (dataUrl: string) => void;
  existingSignature?: string | null;
  label?: string;
  signerRole?: string; // "Judge", "Chief Judge", etc.
}
```

**UI structure:**
```text
┌──────────────────────────────┐
│  [Draw]  [Type to Sign]     │  ← Tabs
├──────────────────────────────┤
│  Draw: existing canvas       │
│  -- OR --                    │
│  Type: text input + cursive  │
│         preview + confirm    │
├──────────────────────────────┤
│  Metadata stamp (rendered    │
│  onto canvas before export): │
│  "Signed: Mar 6, 2026 2:30p │
│   Role: Judge | via Scorz"  │
└──────────────────────────────┘
```

**Type tab logic:**
- Text input for full name
- Live preview in `Dancing Script` cursive font
- "Confirm Signature" button renders the styled text + metadata stamp onto a hidden canvas, exports as PNG data URL

**Metadata stamping:**
- Shared `stampSignature()` function takes any canvas, appends a 30px footer with: timestamp, signer role, "Digitally signed via Scorz"
- Applied to both Draw (on `endDraw`) and Type (on confirm)

### Style Change (`src/index.css`)
- Add Google Font import: `@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');`

### Consumer Pages (import swap for `signerRole` prop only)
All 5 pages keep using `SignaturePad` -- just add `signerRole` prop:

| Page | signerRole |
|---|---|
| `JudgeScoring.tsx` | `"Judge"` |
| `ChiefJudgeDashboard.tsx` | `"Chief Judge"` |
| `TabulatorDashboard.tsx` | `"Tabulator"` |
| `WitnessDashboard.tsx` | `"Witness"` |
| `ContestantRegistration.tsx` | `"Contestant"` |

### Files Changed
| File | Change |
|---|---|
| `src/components/registration/SignaturePad.tsx` | Add Tabs (Draw / Type), metadata stamp |
| `src/index.css` | Dancing Script font import |
| 5 consumer pages | Add `signerRole` prop to `<SignaturePad>` |

