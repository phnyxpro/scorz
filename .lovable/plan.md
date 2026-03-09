

## Plan: Update Advancement to Reassign Sub-Event Instead of Creating New Registrations

### Problem
The current `usePromoteContestants` mutation creates **new** `contestant_registrations` rows for advancing contestants. The user wants it to **update** the existing registration's `sub_event_id` to point to the next level's sub-event instead — same row, same `user_id`, just reassigned.

### Change

**File:** `src/hooks/useLevelAdvancement.ts` — `usePromoteContestants` mutation

Replace the insert logic (lines 150–175) with an update loop:

1. After ranking and selecting the advancing contestants, fetch the first sub-event in the next level (existing logic, keep as-is)
2. Instead of checking for duplicates and inserting new rows, **update each advancing contestant's existing registration** by setting `sub_event_id` to the next level's sub-event ID and updating `sort_order` to their new rank position
3. Use a single batch update: for each advancing registration, call `supabase.from("contestant_registrations").update({ sub_event_id: nextSubEventId, sort_order: index }).eq("id", reg.id)`
4. Return the count of updated registrations

This also removes the RLS issue since it's an UPDATE (not INSERT), and the existing "Admins and organizers can manage registrations" ALL policy already covers updates. The tabulator role has SELECT but not UPDATE — so we also need to check if the tabulator RLS needs an UPDATE policy. Looking at the policies: tabulators only have SELECT. We'll need a new UPDATE policy for tabulators to set `sub_event_id` on registrations.

### Database Migration

Add an UPDATE policy for tabulators on `contestant_registrations`:

```sql
CREATE POLICY "Tabulators can update sub_event for advancement"
ON public.contestant_registrations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'tabulator'::app_role))
WITH CHECK (has_role(auth.uid(), 'tabulator'::app_role));
```

### Files Modified
1. `src/hooks/useLevelAdvancement.ts` — replace insert logic with update logic in `usePromoteContestants`
2. Database migration — add UPDATE policy for tabulators on `contestant_registrations`

