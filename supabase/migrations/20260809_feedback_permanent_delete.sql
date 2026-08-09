begin;

alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check check (status in ('Backlog','Accepted','Declined','In Progress','Review Pending','Complete','DELETED'));

drop policy if exists "moderators delete feedback" on public.feedback;
create policy "moderators delete feedback" on public.feedback
for delete to authenticated
using (public.can_moderate());

commit;
