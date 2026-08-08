begin;

alter table public.matches add column if not exists game_id text;
alter table public.matches drop constraint if exists matches_game_id_not_blank;
alter table public.matches add constraint matches_game_id_not_blank check (game_id is null or btrim(game_id) <> '');
create unique index if not exists matches_game_id_unique_idx on public.matches(game_id) where game_id is not null;

create or replace function public.create_match_with_performances(match_data jsonb, performance_data jsonb)
returns bigint language plpgsql security invoker set search_path=public as $$
declare new_id bigint; item jsonb; requested_game_id text;
begin
  requested_game_id=nullif(btrim(match_data->>'game_id'),'');
  if requested_game_id is null then raise exception 'Game ID is required'; end if;
  perform pg_advisory_xact_lock(7242026);
  if exists(select 1 from public.matches where game_id=requested_game_id) then raise exception 'Game ID % already exists in the archive',requested_game_id; end if;
  select coalesce(max(id),0)+1 into new_id from public.matches;
  insert into public.matches(id,game_id,match_date,friend_group_size,ally_side,result,duration_minutes,notes,created_by)
  values(new_id,requested_game_id,(match_data->>'match_date')::date,(match_data->>'friend_group_size')::int,match_data->>'ally_side',match_data->>'result',(match_data->>'duration_minutes')::numeric,coalesce(match_data->>'notes',''),auth.uid());
  for item in select * from jsonb_array_elements(performance_data) loop
    insert into public.performances(match_id,team,tracked,player,champion,role,kills,deaths,assists,cs,vision,created_by)
    values(new_id,'Ally',true,item->>'player',item->>'champion',item->>'role',(item->>'kills')::int,(item->>'deaths')::int,(item->>'assists')::int,(item->>'cs')::int,(item->>'vision')::int,auth.uid());
  end loop;
  return new_id;
end; $$;

create or replace function public.update_match_with_performances(target_match_id bigint, match_data jsonb, performance_data jsonb)
returns bigint language plpgsql security invoker set search_path=public as $$
declare item jsonb; requested_game_id text;
begin
  requested_game_id=nullif(btrim(match_data->>'game_id'),'');
  if requested_game_id is null then raise exception 'Game ID is required'; end if;
  if exists(select 1 from public.matches where game_id=requested_game_id and id<>target_match_id) then raise exception 'Game ID % already exists in the archive',requested_game_id; end if;
  update public.matches set
    game_id=requested_game_id,
    match_date=(match_data->>'match_date')::date,
    friend_group_size=(match_data->>'friend_group_size')::int,
    ally_side=match_data->>'ally_side',
    result=match_data->>'result',
    duration_minutes=(match_data->>'duration_minutes')::numeric,
    notes=coalesce(match_data->>'notes','')
  where id=target_match_id;
  if not found then raise exception 'Match % was not found', target_match_id; end if;
  delete from public.performances where match_id=target_match_id;
  for item in select * from jsonb_array_elements(performance_data) loop
    insert into public.performances(match_id,team,tracked,player,champion,role,kills,deaths,assists,cs,vision,created_by)
    values(target_match_id,'Ally',true,item->>'player',item->>'champion',item->>'role',(item->>'kills')::int,(item->>'deaths')::int,(item->>'assists')::int,(item->>'cs')::int,(item->>'vision')::int,auth.uid());
  end loop;
  return target_match_id;
end; $$;

create or replace function public.approve_pending_match(target_submission_id bigint,revised_match_data jsonb,revised_performance_data jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare submission public.pending_match_submissions%rowtype; new_id bigint; item jsonb; requested_game_id text;
begin
  if not public.can_moderate() then raise exception 'Moderator or Administrator access is required'; end if;
  select * into submission from public.pending_match_submissions where id=target_submission_id and status='pending' for update;
  if not found then raise exception 'Pending submission was not found'; end if;
  requested_game_id=nullif(btrim(revised_match_data->>'game_id'),'');
  if requested_game_id is null then raise exception 'Game ID is required'; end if;
  perform pg_advisory_xact_lock(7242026);
  if exists(select 1 from public.matches where game_id=requested_game_id) then raise exception 'Game ID % already exists in the archive',requested_game_id; end if;
  select coalesce(max(id),0)+1 into new_id from public.matches;
  insert into public.matches(id,game_id,match_date,friend_group_size,ally_side,result,duration_minutes,notes,created_by)
  values(new_id,requested_game_id,(revised_match_data->>'match_date')::date,(revised_match_data->>'friend_group_size')::int,revised_match_data->>'ally_side',revised_match_data->>'result',(revised_match_data->>'duration_minutes')::numeric,coalesce(revised_match_data->>'notes',''),submission.submitted_by);
  for item in select * from jsonb_array_elements(revised_performance_data) loop
    insert into public.performances(match_id,team,tracked,player,champion,role,kills,deaths,assists,cs,vision,created_by)
    values(new_id,'Ally',true,item->>'player',item->>'champion',item->>'role',(item->>'kills')::int,(item->>'deaths')::int,(item->>'assists')::int,(item->>'cs')::int,(item->>'vision')::int,submission.submitted_by);
  end loop;
  update public.pending_match_submissions set status='approved',match_data=revised_match_data,performance_data=revised_performance_data,reviewed_by=auth.uid(),reviewed_at=now() where id=target_submission_id;
  return new_id;
end; $$;

grant execute on function public.create_match_with_performances(jsonb,jsonb) to authenticated;
grant execute on function public.update_match_with_performances(bigint,jsonb,jsonb) to authenticated;
grant execute on function public.approve_pending_match(bigint,jsonb,jsonb) to authenticated;

commit;
