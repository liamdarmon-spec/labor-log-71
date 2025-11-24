-- Fix: Update log_activity function to properly handle json to jsonb casting
-- The issue is that row_to_json returns json, but the - operator only works on jsonb

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
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('changes', to_jsonb(NEW) - to_jsonb(OLD))
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;