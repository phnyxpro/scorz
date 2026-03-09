

## Add Table View Toggle and Reset Button to Scoring Card

### Changes to `src/pages/JudgeScoring.tsx`

**1. Add state for view mode**
- Add `const [viewMode, setViewMode] = useState<"slider" | "table">("slider");` to the component state (around line 111).

**2. Add toggle + reset button in the Scoring Card header** (lines 609-613)
Replace the CardHeader with a row containing:
- The existing title/description on the left
- A toggle switch (slider/table) and a "Reset" button on the right
- The toggle uses the `Switch` component with a label showing "Table View"
- The Reset button is a destructive outline button that clears all `scores` to `{}`, `duration` to `0`, and `comments` to `""`, with a confirmation via `window.confirm()`

**3. Conditional rendering of criteria** (lines 614-623)
- When `viewMode === "slider"`: render the existing `CriterionSlider` components
- When `viewMode === "table"`: render a compact table with columns: Criterion | Score (input). Each row has the criterion name and a number `<Input>` (type="number", inputMode="decimal", step=0.1, min=0.1, max=5) bound to `scores[criterion.id]`

### New imports needed
- `Switch` from `@/components/ui/switch`
- `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- `RotateCcw` from `lucide-react` (for Reset icon)

### No database changes needed.

