

## PWA Icon with Gradient Background

The current PWA uses `logo.png` (white Scorz logo) directly, which looks invisible on white backgrounds. We need to create proper PWA icons with the theme orange-to-green gradient as the background.

### Approach

1. **Create a script/HTML page** that generates PWA icons as PNGs using Canvas API with:
   - Gradient from brand orange (`hsl(38, 92%, 50%)` → `#F59E0B`) to brand teal/green (`hsl(174, 60%, 40%)` → `#29A38B`)
   - White Scorz logo centered on top
   - Generate both 192x192 and 512x512 sizes

2. Since we can't run Canvas in the build, the practical approach is to **create SVG icons** with the gradient background embedded, then reference them in the manifest. SVG is supported as a PWA icon with `purpose: "any"`.

3. **Create two new files**:
   - `public/pwa-icon-192.svg` — 192x192 SVG with orange→green gradient background + white logo
   - `public/pwa-icon-512.svg` — 512x512 SVG (same design)

4. **Update `vite.config.ts`** manifest icons to reference the new SVG files and update `background_color` to match the gradient start color.

5. **Update `index.html`** `apple-touch-icon` to use the new icon.

### Icon Design
- Rounded rectangle or circle background with linear gradient: top-left orange `#F59E0B` → bottom-right teal `#29A38B`
- White Scorz SVG logo centered (from `src/assets/scorz-logo.svg`)
- Proper padding around the logo

### Files Changed
- **Create** `public/pwa-icon-192.svg` and `public/pwa-icon-512.svg`
- **Edit** `vite.config.ts` — update manifest icons array
- **Edit** `index.html` — update apple-touch-icon href

