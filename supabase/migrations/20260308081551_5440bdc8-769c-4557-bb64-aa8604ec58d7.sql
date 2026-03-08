ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS external_ticket_url text;
ALTER TABLE public.event_tickets ADD COLUMN IF NOT EXISTS payment_status text;