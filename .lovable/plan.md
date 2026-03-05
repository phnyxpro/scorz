

## Plan: Move Updates to Dashboard Action Card

### What Changes

1. **Add "News & Updates" action card to `src/lib/navigation.ts`**
   - Add a new entry in `dashboardCards` for organizers with `{ title: "News & Updates", desc: "Post updates for your events", icon: Newspaper, to: "/updates", roles: ["organizer", "admin"] }`
   - Import `Newspaper` from lucide-react

2. **Create new page `src/pages/UpdatesHub.tsx`**
   - A standalone hub page following the standardized layout (`max-w-6xl mx-auto space-y-6`)
   - Competition selector dropdown at the top (same pattern as other hub pages like TicketsHub/RegistrationsHub)
   - Renders the existing `UpdatesManager` component once a competition is selected
   - Uses `useCompetitions` hook to populate the selector

3. **Register route in `src/App.tsx`**
   - Add `/updates` route pointing to the new `UpdatesHub` page

4. **Remove "Updates" tab from `src/pages/CompetitionDetail.tsx`**
   - Remove the `<TabsTrigger value="updates">` and `<TabsContent value="updates">` block
   - Remove the `UpdatesManager` import

### No database or backend changes needed -- the existing `competition_updates` table and hooks are reused as-is.

