-- Project folders: an optional way to group projects that belong to a bigger job
-- (e.g. "Patio & firepit"). Each household names and colors its own folders.
-- A project is in at most one folder; deleting a folder keeps its projects.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id() references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  color text not null default '#ffd36e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  goal text check (goal is null or length(goal) <= 120),
  created_at timestamptz not null default now()
);
create unique index if not exists folders_household_name_key on public.folders (household_id, lower(name));
alter table public.folders enable row level security;

drop policy if exists household_select on public.folders;
create policy household_select on public.folders for select to authenticated
  using (household_id = public.current_household_id());
drop policy if exists household_insert on public.folders;
create policy household_insert on public.folders for insert to authenticated
  with check (household_id = public.current_household_id());
drop policy if exists household_update on public.folders;
create policy household_update on public.folders for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
-- Deleting a folder only un-files its projects, so any member may do it.
drop policy if exists household_delete on public.folders;
create policy household_delete on public.folders for delete to authenticated
  using (household_id = public.current_household_id());
drop policy if exists require_mfa on public.folders;
create policy require_mfa on public.folders as restrictive for all to authenticated
  using (public.mfa_satisfied()) with check (public.mfa_satisfied());

revoke truncate, references, trigger on public.folders from anon, authenticated;
revoke all on public.folders from anon;

alter table public.projects add column if not exists folder_id uuid references public.folders (id) on delete set null;
create index if not exists projects_folder_idx on public.projects (folder_id);

-- References must stay inside the same household (now including the folder).
create or replace function public.enforce_same_household()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'projects' then
    if new.category_id is not null and not exists (select 1 from public.categories where id = new.category_id and household_id = new.household_id) then
      raise exception 'Category belongs to another household';
    end if;
    if new.folder_id is not null and not exists (select 1 from public.folders where id = new.folder_id and household_id = new.household_id) then
      raise exception 'Folder belongs to another household';
    end if;
    if new.blocked_by is not null and not exists (select 1 from public.projects where id = new.blocked_by and household_id = new.household_id) then
      raise exception 'Blocking project belongs to another household';
    end if;
  elsif tg_table_name = 'service_logs' then
    if not exists (select 1 from public.projects where id = new.project_id and household_id = new.household_id) then
      raise exception 'Project belongs to another household';
    end if;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
