begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('administrator','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_profiles(user_id,email)
select id,coalesce(email,'Unknown user') from auth.users
on conflict (user_id) do update set email=excluded.email;

update public.user_profiles set role='administrator',updated_at=now()
where lower(email)='calciphurgames@gmail.com';

create or replace function public.is_administrator(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_profiles where user_id=check_user and role='administrator');
$$;
grant execute on function public.is_administrator(uuid) to authenticated;

create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_profiles(user_id,email,role) values(new.id,coalesce(new.email,'Unknown user'),'user')
  on conflict (user_id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;
drop trigger if exists create_user_profile_trigger on auth.users;
create trigger create_user_profile_trigger after insert or update of email on auth.users
for each row execute function public.create_user_profile();

alter table public.user_profiles enable row level security;
drop policy if exists "users view own profile and admins view all" on public.user_profiles;
create policy "users view own profile and admins view all" on public.user_profiles
for select to authenticated using (user_id=auth.uid() or public.is_administrator());

create or replace function public.set_user_role(target_user_id uuid,new_role text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_administrator() then raise exception 'Administrator access is required'; end if;
  if new_role not in ('administrator','user') then raise exception 'Invalid role'; end if;
  if target_user_id=auth.uid() and new_role='user' and (select count(*) from public.user_profiles where role='administrator')<=1 then
    raise exception 'The final administrator cannot be demoted';
  end if;
  update public.user_profiles set role=new_role,updated_at=now() where user_id=target_user_id;
  if not found then raise exception 'User profile was not found'; end if;
end;
$$;
grant execute on function public.set_user_role(uuid,text) to authenticated;

drop policy if exists "contributors update matches" on public.matches;
drop policy if exists "owners update matches" on public.matches;
create policy "owners and admins update matches" on public.matches
for update to authenticated using (created_by=auth.uid() or public.is_administrator())
with check (created_by=auth.uid() or public.is_administrator());

drop policy if exists "owners delete matches" on public.matches;
create policy "owners and admins delete matches" on public.matches
for delete to authenticated using (created_by=auth.uid() or public.is_administrator());

drop policy if exists "owners update performances" on public.performances;
create policy "owners and admins update performances" on public.performances
for update to authenticated using (created_by=auth.uid() or public.is_administrator())
with check (created_by=auth.uid() or public.is_administrator());

drop policy if exists "contributors delete performances" on public.performances;
drop policy if exists "owners delete performances" on public.performances;
create policy "owners and admins delete performances" on public.performances
for delete to authenticated using (created_by=auth.uid() or public.is_administrator());

drop policy if exists "contributors view match audit history" on public.match_audit_log;
create policy "administrators view match audit history" on public.match_audit_log
for select to authenticated using (public.is_administrator());

alter table public.match_audit_log drop constraint if exists match_audit_log_match_id_fkey;
alter table public.match_audit_log drop constraint if exists match_audit_log_action_check;
alter table public.match_audit_log add constraint match_audit_log_action_check check (action in ('created','edited','deleted'));

create or replace function public.record_match_audit_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  changes jsonb := '{}'::jsonb;
  user_email text := coalesce(auth.jwt()->>'email','Unknown user');
begin
  if tg_op='DELETE' then
    insert into public.match_audit_log(match_id,action,actor_id,actor_email,changed_fields,before_record,after_record)
    values(old.id,'deleted',auth.uid(),user_email,'{}'::jsonb,to_jsonb(old),to_jsonb(old));
    return old;
  end if;
  if tg_op='UPDATE' then
    if old.match_date is distinct from new.match_date then changes := changes || jsonb_build_object('date',jsonb_build_object('from',old.match_date,'to',new.match_date)); end if;
    if old.friend_group_size is distinct from new.friend_group_size then changes := changes || jsonb_build_object('party size',jsonb_build_object('from',old.friend_group_size,'to',new.friend_group_size)); end if;
    if old.ally_side is distinct from new.ally_side then changes := changes || jsonb_build_object('side',jsonb_build_object('from',old.ally_side,'to',new.ally_side)); end if;
    if old.result is distinct from new.result then changes := changes || jsonb_build_object('result',jsonb_build_object('from',old.result,'to',new.result)); end if;
    if old.duration_minutes is distinct from new.duration_minutes then changes := changes || jsonb_build_object('duration',jsonb_build_object('from',old.duration_minutes,'to',new.duration_minutes)); end if;
    if old.notes is distinct from new.notes then changes := changes || jsonb_build_object('notes',jsonb_build_object('from',old.notes,'to',new.notes)); end if;
  end if;
  insert into public.match_audit_log(match_id,action,actor_id,actor_email,changed_fields,before_record,after_record)
  values(new.id,case when tg_op='INSERT' then 'created' else 'edited' end,auth.uid(),user_email,changes,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists matches_audit_trigger on public.matches;
create trigger matches_audit_trigger after insert or update or delete on public.matches
for each row execute function public.record_match_audit_event();

commit;
