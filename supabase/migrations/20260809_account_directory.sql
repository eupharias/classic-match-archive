begin;

-- Match attribution is resolved from the current account record rather than
-- copying an email onto every match. This keeps labels current if an account
-- email changes while exposing no role or authentication metadata.
create or replace function public.get_archive_account_directory()
returns table(user_id uuid,email text)
language sql
stable
security definer
set search_path=public
as $$
  select profile.user_id,profile.email
  from public.user_profiles profile
  order by profile.email;
$$;

revoke all on function public.get_archive_account_directory() from public;
grant execute on function public.get_archive_account_directory() to anon,authenticated;

commit;
