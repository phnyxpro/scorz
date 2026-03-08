

## Plan: Email Broadcast Feature in Competition Chat Tab

### What
Add an "Email Broadcast" composer within the Chat tab of Competition Detail. Organisers/admins can compose a branded email, select recipient groups (organisers, tabulators, judges, contestants, audience), optionally add custom email addresses, and send it using the existing Scorz branded email template via Resend.

### Recipient Groups
Emails are gathered per competition:
- **Organisers** — profiles with `admin`/`organizer` role
- **Judges** — users in `sub_event_assignments` for this competition with role `judge`
- **Tabulators** — users in `sub_event_assignments` with role `tabulator`
- **Contestants** — `contestant_registrations` with status `approved` for this competition
- **Audience** — `event_tickets` for sub-events in this competition (email column)
- **Custom** — free-text input for additional email addresses (comma-separated)

### UI Component: `EmailBroadcast`
New file: `src/components/chat/EmailBroadcast.tsx`

- Collapsible card below the EventChat in the Chat tab (or as a sibling section)
- Checkbox group for recipient categories with count badges (e.g. "Judges (5)")
- Text input for additional email addresses
- Subject line input
- Rich text body (reuse `RichTextEditor` or simple `Textarea`)
- Preview count: "This will send to X recipients"
- Send button calling the edge function

### Edge Function: `send-broadcast-email`
New file: `supabase/functions/send-broadcast-email/index.ts`

- Auth check: must be admin or organizer
- Accepts: `competition_id`, `subject`, `content` (HTML), `recipient_groups` (string[]), `extra_emails` (string[])
- Resolves recipient emails server-side by querying the relevant tables based on selected groups
- Deduplicates all emails
- Sends individually via Resend using the existing `buildEmail` + `ctaButton` shared template from `_shared/email-html.ts`
- Sender: `Scorz <notify@scorz.live>` (verified domain)
- Returns `{ success: true, sent: number }`

### Integration
- In `CompetitionDetail.tsx` Chat tab content, render `<EmailBroadcast competitionId={id!} />` below `<EventChat>`
- No database schema changes needed — all recipient data comes from existing tables

### Security
- Edge function validates caller is admin/organizer via `has_any_role` RPC
- Custom emails are validated server-side (basic email format check)
- Rate limiting: client-side disable after send, edge function logs activity

