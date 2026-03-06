

## Fix Judge Scoring Layout to Match Dashboard Pages

### Problem
The scoring page's sidebar + content area is nested inside AppLayout's `container` wrapper with padding, but the content area is further constrained to `max-w-2xl` (line 289). The sidebar doesn't extend full height, and the layout doesn't match the full-width feel of dashboard pages.

### Solution

**File: `src/pages/JudgeScoring.tsx`**

1. **Remove `max-w-2xl` constraint** on the main content area — let it fill the available space alongside the sidebar, matching how Dashboard fills the container width
2. **Set proper height** on the outer wrapper: use `min-h-[calc(100vh-theme(spacing.14))]` (minus header height) so the sidebar stretches full page height instead of only as tall as its content
3. **Use negative margins** (`-mx-3 sm:-mx-6 -mt-4 sm:-mt-6`) on the outer flex wrapper to break out of AppLayout's container padding, giving the sidebar a flush edge-to-edge feel
4. **Keep scoring content padded** — the main content area retains comfortable `px-6 py-4` padding matching dashboard pages
5. **Adjust sidebar width** to be consistent with typical sidebar widths and properly bordered

### Changes Summary

| Area | Before | After |
|---|---|---|
| Outer wrapper | `flex h-full min-h-0` | Full viewport height, negative margin bleed |
| Content area | `max-w-2xl mx-auto px-4 py-4` | `px-3 sm:px-6 py-4 sm:py-6` (matches AppLayout container padding) |
| Sidebar height | Content-driven | Full viewport height |
| Overall feel | Narrow card centered | Full-width layout matching Dashboard |

### Single file change: `src/pages/JudgeScoring.tsx`

