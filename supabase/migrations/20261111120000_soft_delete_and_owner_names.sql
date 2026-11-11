-- Soft delete: deleted projects sit in "Recently deleted" for 30 days before being purged.
alter table public.projects add column deleted_at timestamptz;
create index projects_deleted_at_idx on public.projects (deleted_at);

-- Tie each household login to the owner name used on projects (for the "Mine" filter).
alter table public.allowed_emails add column owner_name text check (owner_name in ('Will', 'Natalie'));
update public.allowed_emails set owner_name = 'Will' where email = 'wbmizzou@gmail.com';
update public.allowed_emails set owner_name = 'Natalie' where email = 'natgramling@gmail.com';

-- The signed-in member's owner name (allowed_emails itself stays unreadable through the API).
create function public.current_owner()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select owner_name from public.allowed_emails
  where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke execute on function public.current_owner() from public, anon;
grant execute on function public.current_owner() to authenticated;

-- Permanently remove projects deleted more than 30 days ago. Called by the scheduled
-- keep-alive and when "Recently deleted" is opened; it can only ever remove rows that
-- were already soft-deleted a month ago, so it is safe to expose.
create function public.purge_deleted_projects()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from public.projects where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_deleted_projects() from public;
grant execute on function public.purge_deleted_projects() to anon, authenticated;
