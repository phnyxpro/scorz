

# Add Real Screenshots to Knowledge Base

## Approach

Since we can't bundle large image files in the repo, we'll use the platform's file storage (a public bucket) to host screenshots, then update the articles to reference them.

### Steps

1. **Create a public storage bucket** called `help-images` for hosting KB screenshots

2. **Re-enable image rendering in `src/lib/markdown.ts`** — currently images are stripped out. Change the regex to render `<img>` tags wrapped in styled `<figure>` elements with rounded borders, shadow, and alt-text captions

3. **Capture screenshots** of key app pages using browser automation:
   - Landing page / dashboard overview
   - Sign-up / auth screen
   - Competition creation flow
   - Rubric builder
   - Judge scoring interface
   - Tabulator dashboard
   - Registration form
   - Public events / voting pages
   - Results / scorecard views

4. **Upload each screenshot** to the `help-images` storage bucket

5. **Update image paths in `src/content/help-articles.ts`** to point to the real storage URLs instead of placeholder `/help-images/...` paths

### Files Changed
- `src/lib/markdown.ts` — re-enable image rendering with styled figures
- `src/content/help-articles.ts` — update image URLs to storage paths
- New storage bucket migration for `help-images`

