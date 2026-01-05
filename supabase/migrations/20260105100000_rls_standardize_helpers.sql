-- ============================================================================
-- RLS Standardization Part 1: Canonical tenant auth helpers
-- ============================================================================
-- Goals:
-- - Create public.authed_user_id() with initplan-safe pattern
-- - Create public.authed_company_ids() returning array of company_ids
-- - Update is_company_member to use initplan-safe pattern
-- - All RLS policies should use these helpers
--
-- Initplan rule: wrap auth.uid() in (select auth.uid()) to avoid per-row eval
-- ============================================================================

-- 1) authed_user_id(): returns current user's ID (initplan-safe)
CREATE OR REPLACE FUNCTION public.authed_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT (SELECT auth.uid());
$$;

COMMENT ON FUNCTION public.authed_user_id() IS 'Returns current authenticated user ID. Use this in RLS policies instead of raw auth.uid() for initplan optimization.';

-- 2) authed_company_ids(): returns array of company_ids user belongs to
CREATE OR REPLACE FUNCTION public.authed_company_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(cm.company_id),
    '{}'::uuid[]
  )
  FROM public.company_members cm
  WHERE cm.user_id = (SELECT auth.uid());
$$;

COMMENT ON FUNCTION public.authed_company_ids() IS 'Returns array of company_ids the current user is a member of. Use in RLS: company_id = ANY(public.authed_company_ids())';

-- 3) Update is_company_member to use initplan-safe pattern
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = (SELECT auth.uid())
  );
$$;

COMMENT ON FUNCTION public.is_company_member(uuid) IS 'Returns true if current user is a member of the given company. Uses initplan-safe auth.uid() pattern.';

-- 4) has_company_role: ensure initplan-safe pattern
CREATE OR REPLACE FUNCTION public.has_company_role(p_company_id uuid, p_role public.company_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT m.role
    FROM public.company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = (SELECT auth.uid())
    LIMIT 1
  ),
  ranks AS (
    SELECT
      CASE (SELECT role FROM me)
        WHEN 'owner'::public.company_role THEN 5
        WHEN 'admin'::public.company_role THEN 4
        WHEN 'manager'::public.company_role THEN 3
        WHEN 'member'::public.company_role THEN 2
        WHEN 'viewer'::public.company_role THEN 1
        ELSE 0
      END AS my_rank,
      CASE p_role
        WHEN 'owner'::public.company_role THEN 5
        WHEN 'admin'::public.company_role THEN 4
        WHEN 'manager'::public.company_role THEN 3
        WHEN 'member'::public.company_role THEN 2
        WHEN 'viewer'::public.company_role THEN 1
        ELSE 0
      END AS req_rank
  )
  SELECT (SELECT my_rank FROM ranks) >= (SELECT req_rank FROM ranks);
$$;

-- Grant execute to authenticated
REVOKE ALL ON FUNCTION public.authed_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authed_user_id() TO authenticated;

REVOKE ALL ON FUNCTION public.authed_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authed_company_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_company_role(uuid, public.company_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, public.company_role) TO authenticated;


