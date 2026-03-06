

## Remove Witness Role & Update Tabulator Description

### Changes

**`src/pages/About.tsx`**

1. Remove the Witness entry (lines 60-69) from the `ROLES` array
2. Update the Tabulator description and features to reflect merged witness/timer responsibilities:
   - Description: "Aggregate scores, time performances, audit votes, and verify process integrity."
   - Add timing and witness-related features: "Time each performance and flag overruns", "Observe and verify scoring integrity", "Log observations and flag concerns"
3. Update heading from "seven roles" to "six roles" (line 208)
4. Remove `Eye` from the lucide imports (line 5)
5. Update the FAQ answer (line 104) to remove "witnesses" from the staff assignment mention — change to "judges, chief judges, and tabulators"
6. Update the USP strip (line 188) to remove "witness" from the role-based access description

**`src/lib/navigation.ts`**

- Remove `"witness"` references from the `AppRole` type doc comment (cosmetic, no functional impact since witness isn't in the type union already)

No database or migration changes needed — this is a content/copy update only.

