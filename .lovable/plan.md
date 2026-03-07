

## Display Judge Full Names in Tabulator Dashboard & Public Event Page

### Problem
1. **SideBySideScores** (Side-by-Side Detail tab) shows raw judge UUIDs instead of names
2. **JudgeActivityIndicator** and **LevelParticipants** fall back to email usernames when `full_name` is null in profiles (e.g. "msolwazi.rootsfoundation", "pattianneali")

### Changes

**1. `src/components/tabulator/SideBySideScores.tsx`**
- Add a `judgeProfiles` prop: `Record<string, string>` mapping judge_id → display name
- Replace `{s.judge_id}` (line 53) with `{judgeProfiles?.[s.judge_id] || s.judge_id}`

**2. `src/pages/TabulatorDashboard.tsx`**
- In `SubEventWorkspace`, build a `judgeProfiles` map from the already-fetched `JudgeActivityIndicator` data pattern (query `profiles` table for all unique judge IDs from `allScores`)
- Pass this map to `SideBySideScores` as the new prop

**3. `src/components/chief-judge/JudgeActivityIndicator.tsx`**
- Improve the fallback on line 44: when `full_name` is null, extract a friendly name from email (strip domain, replace dots/underscores with spaces, title-case) instead of showing the raw email prefix

**4. `src/components/public/LevelParticipants.tsx`**
- Same friendly email-to-name fallback when `full_name` is null (line 47)

### Friendly email fallback logic
```typescript
function friendlyName(fullName: string | null, email: string | null): string {
  if (fullName) return fullName;
  if (!email) return "Unknown";
  const local = email.split("@")[0];
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
```
This turns "msolwazi.rootsfoundation" → "Msolwazi Rootsfoundation" as a readable fallback.

### Files changed
- `src/components/tabulator/SideBySideScores.tsx` — add `judgeProfiles` prop, display names
- `src/pages/TabulatorDashboard.tsx` — fetch judge profiles, pass to SideBySideScores
- `src/components/chief-judge/JudgeActivityIndicator.tsx` — friendly email fallback
- `src/components/public/LevelParticipants.tsx` — friendly email fallback

