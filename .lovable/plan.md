

# Enrich Public Event Page

## Overview
Add judges/contestants per level, competition rules link, sponsor logos, a news feed, and social media links to the public event detail page. This requires new database tables and new columns, plus significant updates to the `PublicEventDetail.tsx` page.

## Database Changes (1 migration)

1. **Add columns to `competitions`:**
   - `rules_url` (text, nullable) -- link to competition rules document
   - `social_links` (jsonb, default `{}`) -- e.g. `{ facebook: "...", instagram: "...", twitter: "...", youtube: "...", tiktok: "..." }`

2. **New table: `competition_sponsors`**
   - `id` (uuid, PK)
   - `competition_id` (uuid, FK to competitions)
   - `name` (text)
   - `logo_url` (text)
   - `website_url` (text, nullable)
   - `sort_order` (int, default 0)
   - `created_at`, `updated_at`
   - RLS: public SELECT, admin/organizer ALL

3. **New table: `competition_updates`** (news feed)
   - `id` (uuid, PK)
   - `competition_id` (uuid, FK to competitions)
   - `title` (text)
   - `content` (text)
   - `image_url` (text, nullable)
   - `published_at` (timestamptz, default now())
   - `created_by` (uuid)
   - `created_at`, `updated_at`
   - RLS: public SELECT, admin/organizer ALL

## Frontend Changes

### Admin Side (CompetitionDetail.tsx)
- Add fields to the "General" tab for `rules_url` and social media links (facebook, instagram, twitter/X, youtube, tiktok)
- Add a new "Sponsors" tab with CRUD for sponsor logos (name, logo upload, website URL, sort order)
- Add a new "Updates" tab with CRUD for news posts (title, content, optional image)

### Public Event Page (PublicEventDetail.tsx)
- **Judges & Contestants per level:** For each level section, query `sub_event_assignments` (role = judge) and `contestant_registrations` to show assigned judges' names and registered contestants' names beneath each level card.
- **Rules link:** Show a prominent "Competition Rules" button/link if `rules_url` is set.
- **Sponsors section:** Display sponsor logos in a horizontal scrolling row or grid, each linking to their website.
- **News feed section:** Show competition updates as a vertical timeline/card list, newest first.
- **Social media links:** Display social media icons in the footer/header area linking to the competition's social profiles.

### New Hooks
- `useCompetitionSponsors(compId)` -- fetch sponsors ordered by sort_order
- `useCompetitionUpdates(compId)` -- fetch news posts ordered by published_at desc

## Technical Details

### Queries for Judges & Contestants
The existing `sub_event_assignments` table already tracks judge assignments per sub-event. The page will:
1. Collect all sub-event IDs per level (already available)
2. Query `sub_event_assignments` filtered by those IDs where `role = 'judge'`
3. Join with `profiles` to get judge names
4. Query `contestant_registrations` filtered by `sub_event_id` in those IDs to show contestants

### Sponsor Logo Storage
Reuse the existing `banners` storage bucket for sponsor logos, under a `sponsors/` folder prefix.

### Social Links Schema
Stored as JSONB on competitions: `{ facebook?: string, instagram?: string, x?: string, youtube?: string, tiktok?: string }`. Renders as icon buttons with external links.

