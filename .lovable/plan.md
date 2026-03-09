

## Plan: Undo Promotion + Redesign Advancement to Copy Instead of Move

### Problem
The current promotion logic **moves** contestants by updating their `sub_event_id`, which removes them from the previous level entirely. The correct behavior is to **copy** — create a new registration in the next level while preserving the original. Additionally, the 15 promoted contestants in National Poetry Slam need to be restored to their original Auditions sub-events.

### Data Fix (Step 1)

Restore the 15 contestants back to their original Auditions sub-events using the `sub_event_id` from their existing `judge_scores`:

- 13 contestants go back to **Trinidad** (`14ae92f2-a730-4c72-9aa1-19b0e3561722`)
- 2 contestants (Camryn Bruno, Crystal St Hillaire) go back to **Tobago** (`ed535ad8-6122-42f4-8d27-9d6d62649c99`)

This is a data UPDATE operation (not schema), executed via the insert tool.

### Schema Change (Step 2)

The current unique constraint is `(email, competition_id)` — this prevents a contestant from having registrations in multiple levels. We need to change it to `(email, competition_id, sub_event_id)` so a contestant can exist in both Auditions and Semi-final.

```sql
ALTER TABLE public.contestant_registrations
  DROP CONSTRAINT contestant_registrations_email_competition_id_key;

ALTER TABLE public.contestant_registrations
  ADD CONSTRAINT contestant_registrations_email_competition_sub_event_key
  UNIQUE (email, competition_id, sub_event_id);
```

### Code Change (Step 3)

**File:** `src/hooks/useLevelAdvancement.ts` — `usePromoteContestants` mutation

Replace the UPDATE logic with INSERT logic:
- After ranking contestants and identifying the advancing ones, **insert new registration rows** with the same contestant data (full_name, email, user_id, age_category, etc.) but with `sub_event_id` set to the next level's sub-event
- Skip contestants who already have a registration in the target sub-event (idempotent)
- The original registrations remain untouched in the previous level

The RLS policy change from the last migration (tabulators can UPDATE) should be complemented with an INSERT policy for tabulators, or we revert to having admin/organizer trigger promotions.

### Schema Migration (Step 4)

Add INSERT policy for tabulators:
```sql
CREATE POLICY "Tabulators can insert registrations for advancement"
ON public.contestant_registrations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'tabulator'::app_role));
```

### Files Modified
1. **Database** — data fix (restore 15 contestants to Auditions), constraint change, new INSERT RLS policy
2. `src/hooks/useLevelAdvancement.ts` — change promotion from UPDATE to INSERT (copy)
3. `src/hooks/useRegistrations.ts` — update duplicate error handling for new constraint

