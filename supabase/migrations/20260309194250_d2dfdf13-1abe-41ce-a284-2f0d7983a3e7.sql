CREATE POLICY "Tabulators can update sub_event for advancement"
ON public.contestant_registrations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'tabulator'::app_role))
WITH CHECK (has_role(auth.uid(), 'tabulator'::app_role));