

## Version Check and Update Notice (All Platforms)

The previous plan using VitePWA's `prompt` mode already works for **all browser users** (desktop, tablet, mobile) — not just installed PWAs. Service workers register in all modern browsers. The key addition is ensuring the notification UI is responsive across all form factors.

### 1. Update VitePWA config (`vite.config.ts`)

- Change `registerType` from `'autoUpdate'` to `'prompt'`
- Add `cleanupOutdatedCaches: true` to workbox config
- Keep all existing runtime caching rules intact

### 2. Create `src/components/shared/UpdateNotice.tsx`

- Uses `useRegisterSW` from `virtual:pwa-register/react`
- Renders a fixed bottom banner when `needRefresh` is `true`
- Responsive layout:
  - **Mobile**: full-width bar above the bottom nav (accounting for the `h-14` mobile nav)
  - **Desktop/Tablet**: fixed bottom-right toast-style card
- "Refresh" button calls `updateServiceWorker(true)` — activates waiting SW, clears old caches, reloads
- Dismiss button to snooze

### 3. Mount in `src/App.tsx`

Render `<UpdateNotice />` alongside `<Toaster />` so it's present on all pages (public and protected).

### Files changed
- `vite.config.ts`
- `src/components/shared/UpdateNotice.tsx` (new)
- `src/App.tsx`

