CREATE TABLE public.competition_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier_product_id text NOT NULL,
  stripe_session_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.competition_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credits"
  ON public.competition_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert credits"
  ON public.competition_credits FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own credits"
  ON public.competition_credits FOR UPDATE TO authenticated
  USING (user_id = auth.uid());