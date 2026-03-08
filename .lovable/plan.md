

## Plan: Replace Tab Bar with Dropdown on Mobile for Competition Detail

### Problem
The horizontal tab bar on the Competition Detail page has 12 tabs that overflow on mobile, and the scroll does not reach all items reliably.

### Solution
On mobile, replace the `TabsList` with a `Select` dropdown that shows the current section name. On desktop (sm+), keep the existing horizontal tab bar.

### Changes

**Edit `src/pages/CompetitionDetail.tsx`**:
1. Import `useIsMobile` from `@/hooks/use-mobile`
2. Convert `Tabs` from uncontrolled (`defaultValue`) to controlled state (`value` + `onValueChange`)
3. Conditionally render:
   - **Mobile**: A `Select` dropdown with all 12 tab options, styled to match the design system
   - **Desktop (sm+)**: The existing `TabsList` with `TabsTrigger` buttons (unchanged)
4. Keep all `TabsContent` blocks unchanged — they work with the controlled `value`

### Tab Options Map
```text
general    → General
levels     → Schedule
rules      → Rules
rubric     → Rubric
penalties  → Penalties
scoring    → Scoring
registrations → Registrations
slots      → Time Slots
assignments → Staff
sponsors   → Sponsors
branding   → Branding
chat       → Chat
```

Single file change, no backend or routing modifications needed.

