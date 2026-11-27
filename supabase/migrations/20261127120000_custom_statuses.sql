-- Per-household statuses. Every household keeps the 10 built-in statuses (which can't be renamed
-- or removed, because the app relies on "Recurring" and "Complete"); households can add their own
-- in between, rename them, and remove them once no project uses them.
-- projects.status points at a row here, so renaming a status updates its projects automatically.

create table if not exists public.statuses (
  household_id uuid not null default public.current_household_id() references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 30 and name = trim(name)),
  position integer not null,
  builtin boolean not null default false,
  primary key (household_id, name)
);
create unique index if not exists statuses_household_lower_name_key on public.statuses (household_id, lower(name));
alter table public.statuses enable row level security;

-- The built-in statuses, in lifecycle order (positions leave room for custom ones in between).
create or replace function public.seed_builtin_statuses(hh uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.statuses (household_id, name, position, builtin)
  select hh, v.name, v.pos, true
  from (values ('Wishlist', 100), ('Planned', 200), ('Researching', 300), ('Getting Quotes', 400), ('Not Started', 500),
               ('Scheduled', 600), ('In Progress', 700), ('Waiting', 800), ('Recurring', 900), ('Complete', 1000)) as v(name, pos)
  on conflict do nothing;
$$;
revoke execute on function public.seed_builtin_statuses(uuid) from public, anon, authenticated;

select public.seed_builtin_statuses(id) from public.households;

-- New households get them automatically.
create or replace function public.households_seed_statuses()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_builtin_statuses(new.id);
  return null;
end;
$$;
revoke execute on function public.households_seed_statuses() from public, anon, authenticated;
drop trigger if exists households_seed_statuses on public.households;
create trigger households_seed_statuses after insert on public.households
  for each row execute function public.households_seed_statuses();

-- Built-ins can't be renamed, moved or removed (except when the whole household is deleted).
create or replace function public.protect_builtin_statuses()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.builtin and exists (select 1 from public.households where id = old.household_id) then
      raise exception 'Built-in statuses can''t be removed';
    end if;
    return old;
  end if;
  if old.builtin and (new.name is distinct from old.name or new.position is distinct from old.position or not new.builtin) then
    raise exception 'Built-in statuses can''t be changed';
  end if;
  if new.builtin and not old.builtin then raise exception 'Built-in statuses can''t be changed'; end if;
  return new;
end;
$$;
drop trigger if exists statuses_protect_builtin on public.statuses;
create trigger statuses_protect_builtin before update or delete on public.statuses
  for each row execute function public.protect_builtin_statuses();

-- RLS: same shape as the other household tables. People can only add custom statuses.
drop policy if exists household_select on public.statuses;
create policy household_select on public.statuses for select to authenticated
  using (household_id = public.current_household_id());
drop policy if exists household_insert on public.statuses;
create policy household_insert on public.statuses for insert to authenticated
  with check (household_id = public.current_household_id() and not builtin);
drop policy if exists household_update on public.statuses;
create policy household_update on public.statuses for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
drop policy if exists household_delete on public.statuses;
create policy household_delete on public.statuses for delete to authenticated
  using (household_id = public.current_household_id() and public.is_household_owner());
drop policy if exists require_mfa on public.statuses;
create policy require_mfa on public.statuses as restrictive for all to authenticated
  using (public.mfa_satisfied()) with check (public.mfa_satisfied());
revoke truncate, references, trigger on public.statuses from anon, authenticated;
revoke all on public.statuses from anon;

-- projects.status must be one of the household's statuses; renames carry over to projects.
-- (NO ACTION rather than RESTRICT so deleting a whole household, which cascades to both, still works.)
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects drop constraint if exists projects_status_fkey;
alter table public.projects add constraint projects_status_fkey
  foreign key (household_id, status) references public.statuses (household_id, name) on update cascade;

notify pgrst, 'reload schema';
