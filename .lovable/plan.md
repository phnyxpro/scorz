

## Swipe Gestures + Scoring Notification System

### 1. Swipe Gestures — `src/pages/JudgeScoring.tsx`

Add touch swipe detection on the main scoring area to navigate between contestants on mobile:
- Track `touchStart` / `touchEnd` X coordinates via `onTouchStart` / `onTouchEnd` on the main content div
- Swipe left → next contestant, swipe right → previous contestant (minimum 50px threshold)
- Only active on mobile (`isMobile`), skip if certified or no contestants
- Show a subtle visual hint ("Swipe ← →") below the contestant badge on first load (dismiss after first swipe)

### 2. Edge Function — `supabase/functions/notify-scoring-events/index.ts`

Single new edge function handling three event types via a `type` field in the request body:

| `type` | Trigger | Recipients | Email Subject |
|---|---|---|---|
| `scoring_started` | First score inserted for a sub-event | Admin, Organizer, Tabulator | "Scoring Started — {subEvent}" |
| `judge_certified` | Individual judge certifies all their scores | Admin, Organizer, Tabulator | "Judge Certified — {judgeName} for {subEvent}" |
| `all_certified` | All judges certified (already exists but only emails organizers) | Admin, Organizer, Tabulator |  "All Scores Certified — {subEvent}" |

Logic:
- Accepts `{ type, sub_event_id, judge_id? }` 
- Resolves sub-event → level → competition chain
- Gets recipient list: all users with admin/organizer/tabulator roles + competition creator
- Sends branded email via Resend using `buildEmail` shared template
- Inserts in-app notification into `notifications` table for each recipient

### 3. Database — Notifications table

Create `notifications` table (if not exists — component already references it):
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Users can read/update/delete own notifications
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Service can insert
CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### 4. Trigger calls from client — `src/hooks/useJudgeScores.ts`

- In `useUpsertScore` `onSettled`: if this is the **first score** for the sub-event (check `myScores` length was 0 before), invoke `notify-scoring-events` with `type: "scoring_started"`
- In `useCertifyScore` `onSuccess`: invoke `notify-scoring-events` with `type: "judge_certified"` — the edge function itself will check if ALL judges are now certified and also fire `all_certified`

### 5. Config — `supabase/config.toml`

Add:
```toml
[functions.notify-scoring-events]
  verify_jwt = false
```

### Files changed
- `src/pages/JudgeScoring.tsx` — swipe gesture handler
- `supabase/functions/notify-scoring-events/index.ts` — new edge function
- `src/hooks/useJudgeScores.ts` — trigger notifications on first score + certification
- `supabase/config.toml` — new function config
- Database migration — create `notifications` table + RLS + realtime

