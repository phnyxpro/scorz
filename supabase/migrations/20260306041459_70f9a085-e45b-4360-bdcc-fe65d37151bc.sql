
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS rubric_scale_labels jsonb NOT NULL DEFAULT '{"min":1,"max":5,"labels":{"1":"Very Weak","2":"Weak","3":"Average","4":"Good","5":"Excellent"}}'::jsonb;

ALTER TABLE public.rubric_criteria
ADD COLUMN IF NOT EXISTS guidelines text;
