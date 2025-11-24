-- Fix: Properly compute differences in log_activity function
-- The jsonb - jsonb operator doesn't compute differences, we need a different approach

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    TG_ARGV[0]::TEXT,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    COALESCE(
      CASE WHEN TG_OP = 'INSERT' THEN NEW.created_by ELSE NULL END,
      auth.uid()
    ),
    CASE
      WHEN TG_OP = 'UPDATE' THEN 
        jsonb_build_object(
          'new', to_jsonb(NEW),
          'old', to_jsonb(OLD)
        )
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;