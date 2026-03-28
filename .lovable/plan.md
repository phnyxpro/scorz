

# Offline-First Support for Judges, Chief Judges, and Tabulators

## Overview

Enable Google Docs-style offline resilience so that judges, chief judges, and tabulators can continue working when connectivity drops. All adjudication data is pre-cached locally; writes queue up offline and sync automatically when connectivity returns.

## Architecture

```text
┌──────────────────────────────────────┐
│         React App (UI layer)         │
│                                      │
│  useOfflineCache() — prefetch data   │
│  useOfflineQueue() — queue writes    │
│  OfflineBanner    — sync status UI   │
├──────────────────────────────────────┤
│         IndexedDB (idb library)      │
│                                      │
│  Store: cached_queries               │
│    - competition, levels, sub_events │
│    - rubric_criteria, penalty_rules  │
│    - registrations, judge_scores     │
│    - certifications, assignments     │
│                                      │
│  Store: offline_mutations            │
│    - queued upserts/certifications   │
│    - timestamp, status, payload      │
└──────────────────────────────────────┘
```

## Implementation Steps

### 1. Add `idb` dependency
Install the lightweight `idb` wrapper (~1KB) for typed IndexedDB access.

### 2. Create `src/lib/offline-db.ts` — IndexedDB schema
- Database: `scorz-offline`, version 1
- Object store `cached_queries`: keyed by query key string, stores JSON data + timestamp
- Object store `offline_mutations`: auto-increment key, stores mutation type, payload, created_at, status (pending/synced/failed)

### 3. Create `src/hooks/useOfflineCache.ts` — Data prefetch hook
- Called on JudgeScoring, ChiefJudgeDashboard, TabulatorDashboard mount
- Fetches and caches to IndexedDB: competition, levels, sub_events, rubric_criteria, penalty_rules, contestant_registrations, judge_scores, sub_event_assignments, chief_judge_certifications, tabulator_certifications, performance_durations
- Shows progress indicator (e.g. "Syncing 6/10...")
- Patches React Query's `queryClient` cache from IndexedDB when offline so existing hooks work without modification
- Exposes `{ isSyncing, syncProgress, lastSyncedAt }` state

### 4. Create `src/hooks/useOfflineQueue.ts` — Mutation queue
- Wraps write operations (upsert score, certify score, chief judge certification, tabulator certification)
- When online: execute normally via Supabase, also save to IndexedDB as "synced"
- When offline: save to IndexedDB as "pending", show toast "Saved offline — will sync when connected"
- On reconnect (`online` event): flush pending mutations in order, update status to synced/failed
- Conflict resolution: last-write-wins with timestamp comparison
- Exposes `{ pendingCount, isFlushing, flushErrors }`

### 5. Create `src/components/shared/OfflineBanner.tsx` — Sync status UI
- Persistent banner at top of adjudication pages showing:
  - **Syncing**: animated progress bar + "Downloading data for offline use…"
  - **Synced**: brief green checkmark + "Ready for offline use" (auto-hides after 3s)
  - **Offline**: amber/red banner "You're offline — changes saved locally"
  - **Reconnecting**: "Back online — syncing X changes…"
  - **Sync error**: red banner with retry button
- Compact indicator in header showing offline queue count badge

### 6. Update `ConnectionIndicator.tsx`
- Integrate with offline queue state to show pending sync count
- Add "offline ready" green dot when data is cached
- Show sync errors with retry action

### 7. Update `useUpsertScore` and `useCertifyScore` in `useJudgeScores.ts`
- Wrap mutation functions with offline queue: if offline, store to IndexedDB and optimistically update React Query cache
- Keep existing optimistic update logic (already in place)
- Add error recovery: if sync fails on reconnect, mark for manual retry

### 8. Update `useChiefJudge.ts` mutations
- Same offline queue wrapper for `useUpsertChiefCertification`

### 9. Update `useTabulator.ts` mutations
- Same offline queue wrapper for tabulator certification upserts

### 10. Integrate OfflineBanner into adjudication pages
- `JudgeScoring.tsx`: Add `useOfflineCache()` call + `<OfflineBanner />` at top
- `ChiefJudgeDashboard.tsx`: Same
- `TabulatorDashboard.tsx`: Same

### 11. Update PWA service worker config in `vite.config.ts`
- Extend `runtimeCaching` patterns to ensure all adjudication API endpoints are cached with `NetworkFirst` strategy (upgrade from `StaleWhileRevalidate` for scoring data)
- Add `chief_judge_certifications`, `tabulator_certifications`, `performance_durations`, `penalty_rules` to the cached table patterns

## Technical Details

- **IndexedDB via `idb`**: Chosen over localStorage for structured data, no size limits, and async API
- **No changes to Supabase hooks' query functions**: The offline cache seeds React Query's cache; existing hooks read from React Query as normal
- **Mutation queue uses sequential flush**: Prevents race conditions by replaying mutations in chronological order
- **Conflict detection**: Compare `updated_at` timestamps; if server version is newer, skip the queued mutation and notify user
- **Data freshness**: Re-sync on every page visit when online; cache expiry set to 24 hours for stale detection

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add `idb` dependency |
| `src/lib/offline-db.ts` | New — IndexedDB schema and helpers |
| `src/hooks/useOfflineCache.ts` | New — prefetch and cache seeding |
| `src/hooks/useOfflineQueue.ts` | New — offline mutation queue |
| `src/components/shared/OfflineBanner.tsx` | New — sync status UI |
| `src/components/shared/ConnectionIndicator.tsx` | Update — integrate offline state |
| `src/hooks/useJudgeScores.ts` | Update — wrap mutations with offline queue |
| `src/hooks/useChiefJudge.ts` | Update — wrap mutations with offline queue |
| `src/hooks/useTabulator.ts` | Update — wrap mutations with offline queue |
| `src/pages/JudgeScoring.tsx` | Update — add offline cache + banner |
| `src/pages/ChiefJudgeDashboard.tsx` | Update — add offline cache + banner |
| `src/pages/TabulatorDashboard.tsx` | Update — add offline cache + banner |
| `vite.config.ts` | Update — extend SW runtime caching |

