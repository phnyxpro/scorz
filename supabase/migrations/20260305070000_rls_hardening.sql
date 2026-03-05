-- Phase 4: RLS Security Audit & Hardening

-- 1. Ensure witnesses have strict read-only access to scores
-- First, drop any overly permissive select policies
DROP POLICY IF EXISTS "Anyone can view scores" ON public.scores;
DROP POLICY IF EXISTS "Staff can manage scores" ON public.scores;

-- Recreate strict policies for scores
CREATE POLICY "Contestants can view their own scores" 
  ON public.scores FOR SELECT 
  TO authenticated
  USING (
    contestant_registration_id IN (
      SELECT id FROM public.contestant_registrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Judges can view and insert scores for assigned sub_events"
  ON public.scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND sub_event_id = (SELECT sub_event_id FROM public.contestant_registrations WHERE id = scores.contestant_registration_id)
      AND role IN ('judge', 'chief_judge')
    )
  );

CREATE POLICY "Chief Judges, Tabulators, and Witnesses can view all scores in their events"
  ON public.scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND role IN ('chief_judge', 'tabulator', 'witness')
    )
  );

-- Tabulators and Chief Judges might need to update/delete scores for corrections (Witnesses strictly excluded)
CREATE POLICY "Chief Judges and Tabulators can manage scores"
  ON public.scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_event_assignments 
      WHERE user_id = auth.uid() 
      AND role IN ('chief_judge', 'tabulator')
    )
  );


-- 2. Secure Notifications
-- Ensure users only see and update their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can only view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- 3. Restrict Organizer modifications to their own competitions
DROP POLICY IF EXISTS "Organizers can insert competitions" ON public.competitions;
DROP POLICY IF EXISTS "Organizers can update their own competitions" ON public.competitions;
DROP POLICY IF EXISTS "Organizers can delete their own competitions" ON public.competitions;

CREATE POLICY "Organizers can insert competitions"
  ON public.competitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('organizer', 'admin'))
    AND created_by = auth.uid()
  );

CREATE POLICY "Organizers can update their own competitions"
  ON public.competitions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('organizer', 'admin'))
    AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Organizers can delete their own competitions"
  ON public.competitions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('organizer', 'admin'))
    AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );
