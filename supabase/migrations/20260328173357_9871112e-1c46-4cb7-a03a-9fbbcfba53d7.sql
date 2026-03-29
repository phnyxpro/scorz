
ALTER TABLE public.rubric_criteria ADD COLUMN scale_descriptions jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.rubric_criteria ADD COLUMN point_values jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.rubric_criteria ADD COLUMN is_bonus boolean NOT NULL DEFAULT false;
ALTER TABLE public.rubric_criteria ADD COLUMN applies_to_categories uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.rubric_criteria ADD COLUMN notes text;

ALTER TABLE public.competitions ADD COLUMN rubric_weight_mode text NOT NULL DEFAULT 'percent';
