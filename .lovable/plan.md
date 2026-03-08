

## Plan: Use Official SVG Logos for Social Media Platforms

Replace the text/emoji placeholders in `SocialLinks.tsx` with inline SVG icons for each platform (Facebook, Instagram, X/Twitter, YouTube, TikTok).

### Changes

**Edit `src/components/public/SocialLinks.tsx`**:
- Remove the `platformIcons` text map
- Create a `PlatformIcon` component that renders the official SVG path for each platform
- Use brand-appropriate colors on hover (Facebook blue, Instagram gradient-pink, X black/white, YouTube red, TikTok cyan)
- Each SVG will be ~16×16px inside the existing 32×32 circular button

The SVGs will be inline (no external dependencies), using the standard brand icon paths from Simple Icons / official brand guidelines.

