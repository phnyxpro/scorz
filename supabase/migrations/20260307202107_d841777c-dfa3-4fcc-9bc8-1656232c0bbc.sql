
-- Add channel and recipient_id columns to event_messages
ALTER TABLE public.event_messages 
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS recipient_id uuid NULL;

-- Update existing RLS policies for channel-aware access
-- Drop old policies
DROP POLICY IF EXISTS "Staff can view competition messages" ON public.event_messages;
DROP POLICY IF EXISTS "Staff can send messages" ON public.event_messages;

-- SELECT: staff can see channel messages for their competition, plus DMs where they are sender or recipient
CREATE POLICY "Staff can view channel messages" ON public.event_messages
  FOR SELECT TO authenticated
  USING (
    (recipient_id IS NULL AND is_competition_staff(auth.uid(), competition_id))
    OR (recipient_id IS NOT NULL AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  );

-- INSERT: staff can send to channels in their competition, or send DMs to other staff
CREATE POLICY "Staff can send messages" ON public.event_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (recipient_id IS NULL AND is_competition_staff(auth.uid(), competition_id))
      OR (recipient_id IS NOT NULL AND is_competition_staff(auth.uid(), competition_id))
    )
  );
