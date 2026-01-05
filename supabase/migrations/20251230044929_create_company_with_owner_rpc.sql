-- New function name so we don't fight existing return type
create or replace function public.create_company_with_owner_v2(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_company_id uuid;
begin
  insert into public.companies (name)
  values (p_name)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'owner');

  return v_company_id;
end;
$$;

-- lock it down: only authenticated users can call it
revoke all on function public.create_company_with_owner_v2(text) from public;
grant execute on function public.create_company_with_owner_v2(text) to authenticated;