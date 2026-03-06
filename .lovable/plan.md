

## Event Chat — Real-time Messaging for Competition Staff

### Overview

Add a WhatsApp/Telegram-style chat panel to each competition where organizers, judges, and tabulators can communicate in real-time. Supports text messages, voice notes, and file attachments. Two-way communication — all assigned staff can send and receive.

### Database

**New table: `event_messages`**
- `id` uuid PK
- `competition_id` uuid NOT NULL (FK to competitions)
- `sender_id` uuid NOT NULL (references auth.users)
- `message_type` text NOT NULL DEFAULT 'text' — values: `text`, `voice`, `file`
- `content` text — text body (nullable for voice/file-only)
- `file_url` text — storage URL for voice notes or file attachments
- `file_name` text — original filename
- `reply_to_id` uuid — optional, for threaded replies
- `created_at` timestamptz DEFAULT now()

**RLS policies:**
- SELECT: user must be admin, organizer, or assigned to any sub-event in this competition (judge/tabulator/witness)
- INSERT: same check + `sender_id = auth.uid()`
- No UPDATE/DELETE (messages are immutable, or allow sender to delete own)

**Realtime:** Add `event_messages` to `supabase_realtime` publication.

**Storage:** Create a `chat-attachments` bucket (public) for voice notes and file uploads.

### New Components

**`src/components/chat/EventChat.tsx`** — Main chat component:
- Takes `competitionId` prop
- Scrollable message list with sender name, avatar, timestamp
- Text input with send button
- Attachment button (files up to 10MB)
- Voice note recorder (MediaRecorder API → upload as webm/ogg)
- Real-time subscription to new messages via Supabase Realtime
- Messages grouped by date, newest at bottom, auto-scroll

**`src/components/chat/ChatMessage.tsx`** — Single message bubble:
- Shows sender name, avatar, timestamp
- Text content or audio player (for voice notes) or file download link
- Different alignment for own vs. others' messages (WhatsApp-style)

**`src/components/chat/VoiceRecorder.tsx`** — Voice note recording:
- Hold-to-record or toggle button
- Shows recording duration
- Uploads to `chat-attachments` bucket on release

**`src/hooks/useEventChat.ts`** — Hook for:
- Fetching messages (paginated, newest first)
- Sending messages (text/file/voice)
- Real-time subscription for new messages
- Joining sender profile data

### Integration Points

Add a collapsible chat panel (slide-out drawer or tab) to:
- **CompetitionDetail** (organizer view) — as a new tab "Chat"
- **JudgeDashboard** — floating chat button or panel per competition
- **TabulatorDashboard** — same floating chat button
- **ChiefJudgeDashboard** — same

The chat panel will be a consistent `<EventChat competitionId={id} />` component embedded in each dashboard.

### Files to Create/Edit

| Action | File |
|--------|------|
| Create | `src/components/chat/EventChat.tsx` |
| Create | `src/components/chat/ChatMessage.tsx` |
| Create | `src/components/chat/VoiceRecorder.tsx` |
| Create | `src/hooks/useEventChat.ts` |
| Migration | New table `event_messages`, storage bucket `chat-attachments`, realtime publication |
| Edit | `src/pages/CompetitionDetail.tsx` — add Chat tab |
| Edit | `src/pages/JudgeDashboard.tsx` — add chat panel |
| Edit | `src/pages/TabulatorDashboard.tsx` — add chat panel |
| Edit | `src/pages/ChiefJudgeDashboard.tsx` — add chat panel |

### Security

- RLS ensures only competition-assigned staff can read/write messages
- A security-definer function `is_competition_staff(user_id, competition_id)` checks if user is admin, organizer, or has any `sub_event_assignments` entry for that competition
- File uploads restricted to 10MB, audio files to 2 minutes

