begin;

alter table public.feedback drop constraint if exists feedback_status_check;
update public.feedback set status='Review Pending' where status='REVIEW';
alter table public.feedback alter column status set default 'Backlog';
alter table public.feedback add constraint feedback_status_check check (status in ('Backlog','Accepted','Declined','In Progress','Review Pending','Complete'));
alter table public.feedback add column if not exists updated_at timestamptz not null default now();

drop policy if exists "authenticated users submit feedback" on public.feedback;
create policy "authenticated users submit feedback" on public.feedback
for insert to authenticated
with check (submitted_by=auth.uid() and status='Backlog');

drop policy if exists "moderators review feedback" on public.feedback;
drop policy if exists "authenticated users view feedback" on public.feedback;
create policy "authenticated users view feedback" on public.feedback
for select to authenticated using (true);

drop policy if exists "moderators update feedback" on public.feedback;
create policy "moderators update feedback" on public.feedback
for update to authenticated
using (public.can_moderate())
with check (public.can_moderate());

commit;
