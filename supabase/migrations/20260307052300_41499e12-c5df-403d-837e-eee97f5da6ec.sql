
CREATE OR REPLACE FUNCTION public.notify_admin_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  func_url text;
  anon_key text;
BEGIN
  func_url := 'https://dwcdxofvxsmpbziosvbo.supabase.co/functions/v1/notify-admin-activity';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Y2R4b2Z2eHNtcGJ6aW9zdmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODg0OTIsImV4cCI6MjA4NzU2NDQ5Mn0.bmgC3Y8IYxxcy-U8X9NOQkTbrjINkc8n0FkTFQk_H34';

  PERFORM extensions.http_post(
    func_url,
    jsonb_build_object('record', row_to_json(NEW))::text,
    'application/json'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_activity_log_insert
  AFTER INSERT ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_activity();
