begin;

drop policy if exists "owners update matches" on public.matches;
create policy "contributors update matches" on public.matches
for update to authenticated using (true) with check (true);

drop policy if exists "owners delete performances" on public.performances;
create policy "contributors delete performances" on public.performances
for delete to authenticated using (true);

create or replace function public.update_match_with_performances(target_match_id bigint, match_data jsonb, performance_data jsonb)
returns bigint language plpgsql security invoker set search_path=public as $$
declare item jsonb;
begin
  update public.matches set
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

grant execute on function public.update_match_with_performances(bigint,jsonb,jsonb) to authenticated;

commit;
