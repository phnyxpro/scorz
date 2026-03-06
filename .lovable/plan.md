

# Knowledge Base — Public Help Centre

## Overview
Create a public, no-login-required Knowledge Base at `/help` with documentation rendered from `.md` files, organized by role and workflow. Each article supports screenshot placeholders and embedded video sections. A search bar and sidebar navigation let visitors find content quickly.

## Structure

```text
/help                  → Knowledge Base landing (category grid)
/help/:category/:slug  → Individual article page

src/
  content/
    help/
      getting-started/
        platform-overview.md
        creating-an-account.md
        choosing-your-role.md
      organiser/
        creating-a-competition.md
        managing-registrations.md
        building-rubrics.md
        assigning-staff.md
        ticketing-and-voting.md
      judge/
        scoring-a-performance.md
        using-the-timer.md
        certifying-scorecards.md
      tabulator/
        tabulator-dashboard.md
        timing-performances.md
        certifying-results.md
      contestant/
        registering-for-events.md
        managing-your-profile.md
        viewing-feedback.md
      audience/
        browsing-events.md
        buying-tickets.md
        peoples-choice-voting.md
```

Each `.md` file uses front-matter for metadata:
```markdown
---
title: "Creating a Competition"
category: "Organiser"
order: 1
video: ""  # paste YouTube/Loom URL when ready
---

## Step 1: Navigate to Events
![Step 1 screenshot](/help-images/organiser/create-comp-step1.png)
...
```

## Pages & Components

1. **`/help` — HelpCenter.tsx** (public route, no `ProtectedPage` wrapper)
   - Hero section with search input
   - Category grid cards (Getting Started, Organiser, Judge, Tabulator, Contestant, Audience)
   - Each card links to `/help/:category`
   - Footer link from the landing page

2. **`/help/:category/:slug` — HelpArticle.tsx**
   - Sidebar listing all articles in category (with active highlight)
   - Markdown rendered to HTML via a lightweight parser (use existing prose styling)
   - Screenshot images rendered as bordered, rounded figures with captions
   - Video embed section: if `video` front-matter is set, render responsive iframe; otherwise show a "Video coming soon" placeholder
   - Prev/Next article navigation at bottom

3. **`/help/:category` — HelpCategory.tsx**
   - Lists all articles in that category as cards with title + excerpt
   - Redirects to first article or shows the list

4. **Markdown rendering utility** (`src/lib/markdown.ts`)
   - Parse front-matter (title, category, order, video)
   - Convert markdown to HTML (simple regex-based or use existing tiptap prose styling)
   - Image tags get wrapped in `<figure>` with placeholder fallback

5. **Search** — client-side filter across all article titles and content

## Routing Changes (App.tsx)
Add three public routes (no `ProtectedPage` wrapper, similar to `/about`):
```
/help          → HelpCenter
/help/:category → HelpCategory  
/help/:category/:slug → HelpArticle
```

## Navigation
- Add "Help" link to the public landing page header/footer
- Add a `BookOpen` icon link in the app sidebar (visible to all roles)

## Media Approach
- Create `public/help-images/` directory with subdirectories per category
- Markdown `![alt](path)` tags render as styled figures with rounded borders and captions
- Empty/missing images show a grey placeholder with "Screenshot coming soon"
- Video front-matter renders as a responsive 16:9 iframe embed, or a styled placeholder card

## File Count
- ~6 new page/component files
- ~18 markdown content files (starter docs with placeholder content)
- 1 markdown parser utility
- Route + nav updates

