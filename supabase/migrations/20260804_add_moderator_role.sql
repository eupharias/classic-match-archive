begin;

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check check (role in ('administrator','moderator','user'));

create or replace function public.can_moderate(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_profiles where user_id=check_user and role in ('administrator','moderator'));
$$;
grant execute on function public.can_moderate(uuid) to authenticated;

drop policy if exists "users view own profile and admins view all" on public.user_profiles;
create policy "users view own profile and moderators view all" on public.user_profiles
for select to authenticated using (user_id=auth.uid() or public.can_moderate());

create or replace function public.set_user_role(target_user_id uuid,new_role text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_administrator() then raise exception 'Administrator access is required'; end if;
  if new_role not in ('administrator','moderator','user') then raise exception 'Invalid role'; end if;
  if target_user_id=auth.uid() and new_role<>'administrator' and (select count(*) from public.user_profiles where role='administrator')<=1 then raise exception 'The final administrator cannot be demoted'; end if;
  update public.user_profiles set role=new_role,updated_at=now() where user_id=target_user_id;
  if not found then raise exception 'User profile was not found'; end if;
end;
$$;

drop policy if exists "owners and admins update matches" on public.matches;
create policy "owners and moderators update matches" on public.matches for update to authenticated
using (created_by=auth.uid() or public.can_moderate()) with check (created_by=auth.uid() or public.can_moderate());

drop policy if exists "owners and admins delete matches" on public.matches;
create policy "owners and moderators delete matches" on public.matches for delete to authenticated
using (created_by=auth.uid() or public.can_moderate());

drop policy if exists "owners and admins update performances" on public.performances;
create policy "owners and moderators update performances" on public.performances for update to authenticated
using (created_by=auth.uid() or public.can_moderate()) with check (created_by=auth.uid() or public.can_moderate());

drop policy if exists "owners and admins delete performances" on public.performances;
create policy "owners and moderators delete performances" on public.performances for delete to authenticated
using (created_by=auth.uid() or public.can_moderate());

drop policy if exists "administrators view match audit history" on public.match_audit_log;
create policy "moderators view match audit history" on public.match_audit_log for select to authenticated using (public.can_moderate());

drop policy if exists "administrators view deleted matches" on public.matches;
create policy "moderators view deleted matches" on public.matches for select to authenticated using (public.can_moderate());

drop policy if exists "administrators view deleted performances" on public.performances;
create policy "moderators view deleted performances" on public.performances for select to authenticated using (public.can_moderate());

create or replace function public.restore_match(target_match_id bigint)
returns bigint language plpgsql security definer set search_path=public as $$
begin
  if not public.can_moderate() then raise exception 'Moderator or Administrator access is required'; end if;
  update public.matches set deleted_at=null,deleted_by=null where id=target_match_id and deleted_at is not null;
  if not found then raise exception 'Deleted match % was not found',target_match_id; end if;
  return target_match_id;
end;
$$;

commit;
