
-- Read cursor per user per competition (tracks last time they viewed the chat)
CREATE TABLE public.chat_read_cursors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

ALTER TABLE public.chat_read_cursors ENABLE ROW LEVEL SECURITY;

-- Users can read/upsert their own cursor
CREATE POLICY "Users can manage own read cursor"
ON public.chat_read_cursors FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Staff can view all cursors for read receipts display
CREATE POLICY "Staff can view read cursors"
ON public.chat_read_cursors FOR SELECT
USING (public.is_competition_staff(auth.uid(), competition_id));
