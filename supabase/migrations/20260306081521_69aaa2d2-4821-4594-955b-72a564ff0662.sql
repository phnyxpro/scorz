
-- Security definer function to check if user is staff for a competition
CREATE OR REPLACE FUNCTION public.is_competition_staff(_user_id uuid, _competition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin or organizer
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'organizer')
  ) OR EXISTS (
    -- Assigned to any sub-event in this competition
    SELECT 1
    FROM public.sub_event_assignments sa
    JOIN public.sub_events se ON se.id = sa.sub_event_id
    JOIN public.competition_levels cl ON cl.id = se.level_id
    WHERE sa.user_id = _user_id AND cl.competition_id = _competition_id
  )
$$;

-- Create event_messages table
CREATE TABLE public.event_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  file_url text,
  file_name text,
  reply_to_id uuid REFERENCES public.event_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: competition staff can read
CREATE POLICY "Staff can view competition messages"
ON public.event_messages FOR SELECT
USING (public.is_competition_staff(auth.uid(), competition_id));

-- INSERT: competition staff, sender must be self
CREATE POLICY "Staff can send messages"
ON public.event_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_competition_staff(auth.uid(), competition_id)
);

-- DELETE: sender can delete own messages
CREATE POLICY "Users can delete own messages"
ON public.event_messages FOR DELETE
USING (sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat-attachments
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');
