

## Add Web Push Notifications to Scorz PWA

Push notifications require VAPID keys, a `push_subscriptions` database table, a custom service worker for push event handling, client-side subscription logic, and a backend function to send pushes.

### 1. Generate VAPID Keys & Store as Secrets

Web Push requires a VAPID key pair. We'll generate them and store:
- `VAPID_PUBLIC_KEY` — exposed to frontend via an edge function or hardcoded (it's public)
- `VAPID_PRIVATE_KEY` — stored as a secret for edge functions

You'll need to generate these (e.g. via `npx web-push generate-vapid-keys`) and add them via the secrets tool.

### 2. Database: `push_subscriptions` Table

Create a table to store user push subscription endpoints:

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  keys jsonb NOT NULL, -- {p256dh, auth}
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Users manage their own subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### 3. Custom Service Worker Push Handler

VitePWA's generated service worker doesn't handle `push` events. We need a custom service worker file (`public/custom-sw.js`) that listens for push events and shows notifications:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Scorz', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: '/pwa-icon-192.svg', badge: '/pwa-icon-192.svg',
      data: { url: data.link || '/' }
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

Import this in VitePWA config via `importScripts` in workbox config.

### 4. Client-Side: Subscribe & Permission Hook

Create `src/hooks/usePushNotifications.ts`:
- Request `Notification.permission`
- Subscribe via `registration.pushManager.subscribe()` with the VAPID public key
- Save the subscription to `push_subscriptions` table
- Provide an `unsubscribe` function
- Expose a UI toggle component in Settings or NotificationCenter

### 5. Edge Function: `send-push-notification`

Create `supabase/functions/send-push-notification/index.ts`:
- Accepts `{ user_ids: string[], title, body, link? }`
- Fetches subscriptions from `push_subscriptions`
- Uses the Web Push protocol (via `web-push` library for Deno) with VAPID keys to send to each endpoint
- Cleans up expired/invalid subscriptions (410 responses)

### 6. Integration with Existing Notification System

Update the existing notification edge functions (`notify-scoring-events`, `notify-admin-activity`, etc.) to also call `send-push-notification` after inserting into the `notifications` table — so users get both in-app and push notifications.

Alternatively, add a database trigger on `notifications` INSERT that invokes `send-push-notification` automatically.

### 7. UI: Permission Prompt & Toggle

Add a push notification toggle in the NotificationCenter popover header or Settings page. Show a one-time prompt banner for logged-in users who haven't subscribed yet.

### Files to create/modify:
- **Create** `public/custom-sw.js` — push event handler
- **Create** `src/hooks/usePushNotifications.ts` — subscription management hook
- **Create** `supabase/functions/send-push-notification/index.ts` — send push via Web Push API
- **Modify** `vite.config.ts` — add `importScripts` for custom SW
- **Modify** `src/components/notifications/NotificationCenter.tsx` — add push toggle
- **Modify** existing notification edge functions — trigger push alongside email
- **Database migration** — create `push_subscriptions` table with RLS

### Secrets needed:
- `VAPID_PUBLIC_KEY` (can be in frontend code — it's public)
- `VAPID_PRIVATE_KEY` (edge function secret)

