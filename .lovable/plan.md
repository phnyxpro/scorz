

## Add URL Slugs to Public Event Pages

### What Changes

Replace UUID-based public event URLs (`/events/a1000000-...`) with clean, human-readable slugs (`/events/fcnps2025`).

### Steps

**1. Add `slug` column to `competitions` table**
- Add a unique, non-null `slug` text column to `competitions`
- Auto-populate existing rows: generate slug from the competition name (lowercased, spaces to hyphens, special chars stripped)
- Set the FCNPS competition slug explicitly to `fcnps2025`
- Add a unique index for fast lookups

**2. Update `PublicEventDetail.tsx` -- fetch by slug instead of UUID**
- Change the `usePublicCompetition` hook to query `.eq("slug", id)` instead of `.eq("id", id)`
- Internal links that reference `comp.id` (e.g. register, vote) remain unchanged since those use the authenticated `/competitions/:id` routes

**3. Update `PublicEvents.tsx` -- link using slug**
- Change the event card links from `/events/${comp.id}` to `/events/${comp.slug}`

**4. No route change needed**
- The route stays `/events/:id` in App.tsx -- the param just holds a slug now instead of a UUID

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.competitions ADD COLUMN slug text;
UPDATE public.competitions SET slug = 'fcnps2025' WHERE id = 'a1000000-0000-0000-0000-000000000001';
UPDATE public.competitions SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
UPDATE public.competitions SET slug = id WHERE slug IS NULL OR slug = '';
ALTER TABLE public.competitions ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_slug_key UNIQUE (slug);
```

**Files modified:**
- `src/pages/PublicEventDetail.tsx` -- query by slug
- `src/pages/PublicEvents.tsx` -- link to slug
- Database migration (new)

