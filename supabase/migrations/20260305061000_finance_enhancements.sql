-- Add registration_fee to competitions table for financial tracking
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
