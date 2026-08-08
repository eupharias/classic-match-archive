begin;

create unique index if not exists pending_match_game_id_unique_idx
on public.pending_match_submissions ((match_data->>'game_id'))
where status = 'pending' and nullif(btrim(match_data->>'game_id'),'') is not null;

create or replace function public.submit_match_for_review(match_data jsonb,performance_data jsonb,capture_metadata jsonb,external_capture_id text)
returns bigint language plpgsql security definer set search_path=public as $$
declare submission_id bigint; requested_game_id text;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  requested_game_id=nullif(btrim(match_data->>'game_id'),'');
  if requested_game_id is null then raise exception 'Game ID is required'; end if;
  if jsonb_array_length(coalesce(performance_data,'[]'::jsonb))=0 then raise exception 'At least one player performance is required'; end if;
  perform pg_advisory_xact_lock(7242026);
  if exists(select 1 from public.matches where game_id=requested_game_id) then
    raise exception 'Game ID % already exists in the archive',requested_game_id;
  end if;
  if exists(select 1 from public.pending_match_submissions p where p.status='pending' and p.match_data->>'game_id'=requested_game_id) then
    raise exception 'Game ID % is already awaiting review',requested_game_id;
  end if;
  insert into public.pending_match_submissions(submitted_by,submitter_email,match_data,performance_data,capture_metadata,external_capture_id,status)
  values(auth.uid(),coalesce(auth.jwt()->>'email','Unknown user'),match_data,performance_data,coalesce(capture_metadata,'{}'::jsonb),coalesce(nullif(btrim(external_capture_id),''),'game-'||requested_game_id),'pending')
  returning id into submission_id;
  return submission_id;
end;
$$;
grant execute on function public.submit_match_for_review(jsonb,jsonb,jsonb,text) to authenticated;

commit;
