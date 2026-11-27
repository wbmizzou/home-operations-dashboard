-- Photos on projects. Each photo belongs to one project; files live in a private storage
-- bucket under <household_id>/<project_id>/<photo_id>.jpg (plus a small _t.jpg thumbnail),
-- so each household can only reach its own files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-photos', 'project-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id() references public.households (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null unique,
  caption text check (caption is null or length(caption) <= 120),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists project_photos_project_idx on public.project_photos (project_id, created_at);
alter table public.project_photos enable row level security;

drop policy if exists household_select on public.project_photos;
create policy household_select on public.project_photos for select to authenticated
  using (household_id = public.current_household_id());
-- The project must be the household's own, and the file must sit in the household's folder.
drop policy if exists household_insert on public.project_photos;
create policy household_insert on public.project_photos for insert to authenticated
  with check (household_id = public.current_household_id()
    and exists (select 1 from public.projects p where p.id = project_id and p.household_id = public.current_household_id())
    and path like public.current_household_id()::text || '/' || project_id::text || '/%');
-- Only the caption can change.
drop policy if exists household_update on public.project_photos;
create policy household_update on public.project_photos for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
revoke update on public.project_photos from authenticated;
grant update (caption) on public.project_photos to authenticated;
drop policy if exists household_delete on public.project_photos;
create policy household_delete on public.project_photos for delete to authenticated
  using (household_id = public.current_household_id());
drop policy if exists require_mfa on public.project_photos;
create policy require_mfa on public.project_photos as restrictive for all to authenticated
  using (public.mfa_satisfied()) with check (public.mfa_satisfied());
revoke truncate, references, trigger on public.project_photos from anon, authenticated;
revoke all on public.project_photos from anon;

-- Storage: read, upload and delete only inside your own household's folder (no overwriting).
drop policy if exists "project photos: read own household" on storage.objects;
create policy "project photos: read own household" on storage.objects for select to authenticated
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = public.current_household_id()::text and public.mfa_satisfied());
drop policy if exists "project photos: upload to own household" on storage.objects;
create policy "project photos: upload to own household" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-photos' and (storage.foldername(name))[1] = public.current_household_id()::text and public.mfa_satisfied());
drop policy if exists "project photos: delete own household" on storage.objects;
create policy "project photos: delete own household" on storage.objects for delete to authenticated
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = public.current_household_id()::text and public.mfa_satisfied());

notify pgrst, 'reload schema';
