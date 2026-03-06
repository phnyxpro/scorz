

## Problem

The auth initialization in `AuthContext.tsx` has a race condition causing slow loading:

1. **`onAuthStateChange` with `INITIAL_SESSION`** fires but explicitly skips `setLoading(false)` (line 155-157), while also running expensive `await fetchRoles()` and `await assignSignupRole()` inside the callback — blocking subsequent auth events.
2. **`getSession()`** also runs in parallel and calls `fetchRoles` + `assignSignupRole` — duplicating work.
3. The `refreshSubscription()` edge function call fires on every session change, adding network latency before the UI becomes interactive.

Result: `loading` stays `true` longer than necessary, showing the "Loading..." fallback or skeletons across all protected pages.

## Plan

**1. Fix auth initialization in `AuthContext.tsx`**

- Make `getSession()` the single source-of-truth for initial load. Set `loading = false` immediately after session is resolved and roles are fetched — no duplication.
- In `onAuthStateChange`: remove `await` from the callback body. Use fire-and-forget (`fetchRoles(...).then(...)`) for non-blocking role/welcome-email updates on subsequent events (SIGNED_IN, TOKEN_REFRESHED). Skip processing for `INITIAL_SESSION` entirely since `getSession` handles it.
- Move `assignSignupRole` to only fire on `SIGNED_IN` events (not on every page load).

**2. Defer subscription check**

- Don't block the loading state on `refreshSubscription()`. It already runs in a separate `useEffect` — just ensure it doesn't contribute to perceived load time by confirming it's fully decoupled from the `loading` flag (it already is, but the duplicate role-fetch delays everything).

**3. Summary of changes**

Single file change: `src/contexts/AuthContext.tsx`
- Restructure the `useEffect` to avoid awaiting inside `onAuthStateChange`
- Remove duplicate `fetchRoles` call from `getSession` path vs `onAuthStateChange` path
- Set `loading = false` as early as possible after `getSession` resolves

