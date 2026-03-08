

## Plan: Level Advancement Settings & Special Contestants

### Summary
Add two new features to each competition level: (1) how many contestants advance to the next level, and (2) support for special contestant entries (previous winners, wild cards, sub-competition winners) that get added to the level.

### Database Migration
Add columns to `competition_levels`:
- `advancement_count` (integer, nullable) — number of contestants advancing from this level to the next
- `special_entries` (jsonb, default `'[]'`) — array of objects like `{ type: "previous_winner" | "wild_card" | "sub_competition_winner", label: string }` describing special contestants included in this level

### UI Changes (LevelsManager.tsx)
Within each level's collapsible content, add an editable settings section:

1. **Advancement Count** — a numeric input labeled "Contestants advancing to next level" that saves on blur/change via direct Supabase update
2. **Special Entries** — a multi-select or tag-style UI with preset options (Previous Winners, Wild Cards, Sub-Competition Winners) plus a custom label input. Displayed as badges. Add/remove updates the `special_entries` JSONB array.

Both fields update via `supabase.from("competition_levels").update(...)` with query invalidation, following the same pattern used for `banner_url` updates.

### Display
- Show advancement count as a badge on the level header (e.g., "Top 10 advance")
- Show special entry badges (e.g., "Wild Cards", "Previous Winners") on the level header

### Files Changed
- **Migration**: Add `advancement_count` and `special_entries` columns to `competition_levels`
- **`src/components/competition/LevelsManager.tsx`**: Add advancement input and special entries manager inside each level's collapsible content

