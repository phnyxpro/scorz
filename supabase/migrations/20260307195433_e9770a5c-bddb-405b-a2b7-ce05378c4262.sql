
CREATE OR REPLACE FUNCTION public.notify_on_full_certification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uncertified_count integer;
  total_count integer;
  func_url text;
  anon_key text;
BEGIN
  -- Only trigger when is_certified changes to true
  IF NEW.is_certified IS NOT TRUE OR OLD.is_certified IS NOT DISTINCT FROM NEW.is_certified THEN
    RETURN NEW;
  END IF;

  -- Count uncertified scores for this sub-event
  SELECT COUNT(*) INTO total_count
  FROM public.judge_scores
  WHERE sub_event_id = NEW.sub_event_id;

  SELECT COUNT(*) INTO uncertified_count
  FROM public.judge_scores
  WHERE sub_event_id = NEW.sub_event_id AND is_certified = false;

  -- If all scores are now certified, fire the notification
  IF total_count > 0 AND uncertified_count = 0 THEN
    func_url := 'https://dwcdxofvxsmpbziosvbo.supabase.co/functions/v1/notify-certification-complete';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Y2R4b2Z2eHNtcGJ6aW9zdmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODg0OTIsImV4cCI6MjA4NzU2NDQ5Mn0.bmgC3Y8IYxxcy-U8X9NOQkTbrjINkc8n0FkTFQk_H34';

    BEGIN
      PERFORM extensions.http_post(
        func_url,
        jsonb_build_object('sub_event_id', NEW.sub_event_id)::text,
        'application/json'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't block certification if notification fails
      RAISE WARNING 'notify_on_full_certification: http_post failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
