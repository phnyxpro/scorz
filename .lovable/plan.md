

## Display Staff-Entered Names & Widen Truncation in JudgeActivityIndicator

### Problem
1. Judge names truncate at `max-w-[100px]`, cutting off longer names
2. The component only checks `profiles.full_name` — it doesn't use the name entered by the organiser in the "Add Staff Member" form (stored in `staff_invitations.name`)

### Changes

**`src/components/chief-judge/JudgeActivityIndicator.tsx`**

1. **Fetch staff invitation names**: After fetching profiles, also query `staff_invitations` filtered by the judge emails to get the organiser-entered `name` field
2. **Name priority**: Use `staff_invitations.name` first, then `profiles.full_name`, then friendly email fallback
3. **Widen truncation**: Change `max-w-[100px]` to `max-w-[180px]` so longer names are visible

The lookup flow:
- Get judge user_ids from assignments (already done)
- Fetch profiles for those user_ids (already done) — gives emails
- Query `staff_invitations` matching those emails to get organiser-entered names
- Build name map: invitation name → profile full_name → friendly email

### Files changed
- `src/components/chief-judge/JudgeActivityIndicator.tsx` — add staff invitation name query, widen truncation

