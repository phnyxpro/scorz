
# Assign All Roles to stefan@phnyx.pro

## What will happen
All 8 system roles will be assigned to the account `stefan@phnyx.pro` (user ID: `b0b252c9-6e8c-4489-a2f9-032da99498a4`), enabling full access to every interface in the platform.

## Roles to add
The following roles will be inserted into the `user_roles` table (admin already exists):
- organizer
- chief_judge
- judge
- tabulator
- witness
- contestant
- audience

## Technical details
- A single INSERT into `user_roles` with 7 new rows
- The existing `admin` role remains untouched
- The unique constraint on `(user_id, role)` prevents duplicates
- No schema or code changes needed -- just a data insert
