

## Two Issues to Address

### Issue 1: Set Judge Passwords

Setting passwords for auth users cannot be done via SQL — it requires the Supabase Admin API (`admin.updateUserById`). 

**Judges (5 accounts):**
- Jean-Claude Cournand (jeanclaude.cournand@gmail.com)
- Kwame Weekes (kwameweekesbookings@gmail.com)
- Mtmima Solwazi (msolwazi.rootsfoundation@gmail.com)
- Patti-Anne Ali (pattianneali@yahoo.com)
- Shivanee Ramlochan (shivanee@bocaslitfest.com)

**Plan:** Create a temporary edge function `set-user-password` that accepts an email and password, looks up the user via the Admin API, and sets their password. Call it 5 times via curl, then delete the function.

---

### Issue 2: Score Cards Not Showing Criterion Values

**Root cause identified:** The `ScoreCard` component (`src/components/shared/ScoreCard.tsx`) has **hardcoded** scoring criteria ("Creativity", "Technique", "Presentation", "Overall") and tries to access `criterion_scores.creativity`, etc.

However, actual `judge_scores.criterion_scores` uses **UUID keys** (rubric_criteria IDs like `2794170b-f3ed-4067-a12f-21caba981e18`), and the actual criteria are "Voice and Articulation", "Stage Presence", "Dramatic Appropriateness", etc.

The hardcoded names will never match the UUID keys, so all criterion cells show blank.

**Fix:** Update `ScoreCard` to accept a `rubricCriteria` prop (array of `{id, name}`) and dynamically render columns using those names, mapping UUID keys from `criterion_scores` to display names. Update `ScoreCardExporter` and `ScoreCardExportSection` to fetch and pass rubric criteria.

### Changes

1. **Create + deploy + call + delete** `set-user-password` edge function for the 5 judges
2. **Update `ScoreCard.tsx`** — accept `rubricCriteria` prop, dynamically render criterion columns using UUID-to-name mapping
3. **Update `ScoreCardExporter.tsx`** — pass through rubric criteria
4. **Update `ScoreCardExportSection.tsx`** — fetch rubric criteria for the selected competition and pass them down

