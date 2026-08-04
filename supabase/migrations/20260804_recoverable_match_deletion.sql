begin;

alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists deleted_by uuid references auth.users(id) on delete set null;
create index if not exists matches_deleted_at_idx on public.matches(deleted_at) where deleted_at is not null;

drop policy if exists "owners and admins delete matches" on public.matches;

drop policy if exists "matches are public" on public.matches;
create policy "active matches are public" on public.matches
for select to anon,authenticated using (deleted_at is null);
create policy "administrators view deleted matches" on public.matches
for select to authenticated using (public.is_administrator());

drop policy if exists "performances are public" on public.performances;
create policy "active performances are public" on public.performances
for select to anon,authenticated using (
  exists(select 1 from public.matches where matches.id=performances.match_id and matches.deleted_at is null)
);
create policy "administrators view deleted performances" on public.performances
for select to authenticated using (public.is_administrator());

alter table public.match_audit_log drop constraint if exists match_audit_log_action_check;
alter table public.match_audit_log add constraint match_audit_log_action_check check (action in ('created','edited','deleted','restored'));

create or replace function public.soft_delete_match(target_match_id bigint)
returns bigint language plpgsql security invoker set search_path=public as $$
begin
  update public.matches set deleted_at=now(),deleted_by=auth.uid()
  where id=target_match_id and deleted_at is null;
  if not found then raise exception 'Match % was not found or you do not have permission',target_match_id; end if;
  return target_match_id;
end;
$$;
grant execute on function public.soft_delete_match(bigint) to authenticated;

create or replace function public.restore_match(target_match_id bigint)
returns bigint language plpgsql security definer set search_path=public as $$
begin
  if not public.is_administrator() then raise exception 'Administrator access is required'; end if;
  update public.matches set deleted_at=null,deleted_by=null where id=target_match_id and deleted_at is not null;
  if not found then raise exception 'Deleted match % was not found',target_match_id; end if;
  return target_match_id;
end;
$$;
grant execute on function public.restore_match(bigint) to authenticated;

create or replace function public.record_match_audit_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  changes jsonb := '{}'::jsonb;
  user_email text := coalesce(auth.jwt()->>'email','Unknown user');
  event_action text;
begin
  if tg_op='DELETE' then
    insert into public.match_audit_log(match_id,action,actor_id,actor_email,changed_fields,before_record,after_record)
    values(old.id,'deleted',auth.uid(),user_email,'{}'::jsonb,to_jsonb(old),to_jsonb(old));
    return old;
  end if;
  if tg_op='INSERT' then event_action:='created';
  elsif old.deleted_at is null and new.deleted_at is not null then event_action:='deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then event_action:='restored';
  else event_action:='edited';
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
  values(new.id,event_action,auth.uid(),user_email,changes,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end;
$$;

commit;
