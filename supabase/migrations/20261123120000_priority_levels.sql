-- Per-household priority levels (like categories): each household names its own
-- P1, P2, … and can add more. projects.priority keeps storing the level number.

create table if not exists public.priority_levels (
  household_id uuid not null default public.current_household_id() references public.households (id) on delete cascade,
  level smallint not null check (level between 1 and 20),
  label text not null check (length(trim(label)) between 1 and 20),
  focus text check (focus is null or length(focus) <= 60),
  primary key (household_id, level)
);
alter table public.priority_levels enable row level security;
drop policy if exists own_household on public.priority_levels;
create policy own_household on public.priority_levels for all to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());

-- The original household (the one using the custom house illustration) keeps its exact P1–P5.
insert into public.priority_levels (household_id, level, label, focus)
select h.id, v.level, v.label, v.focus
from public.households h
cross join (values (1, 'P1', 'Protect the house'), (2, 'P2', 'Prevent deterioration'), (3, 'P3', 'Restore the landscape'),
                   (4, 'P4', 'Improve enjoyment'), (5, 'P5', 'Longer-term upgrades')) as v(level, label, focus)
where h.hero = 'hollow'
on conflict do nothing;

-- Everyone else starts with generic levels they can rename.
insert into public.priority_levels (household_id, level, label, focus)
select h.id, v.level, v.label, v.focus
from public.households h
cross join (values (1, 'P1', 'Urgent'), (2, 'P2', 'High'), (3, 'P3', 'Medium'), (4, 'P4', 'Low'), (5, 'P5', 'Someday')) as v(level, label, focus)
where h.hero <> 'hollow'
on conflict do nothing;

-- Projects can use any level a household defines (up to 20).
alter table public.projects drop constraint if exists projects_priority_check;
alter table public.projects add constraint projects_priority_check check (priority between 1 and 20);

-- New households get the generic levels automatically.
create or replace function public.create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.current_household_id() is not null then raise exception 'You already belong to a household'; end if;
  insert into public.households (name, created_by) values (trim(p_name), auth.uid()) returning id into hh;
  insert into public.household_members (household_id, user_id, display_name, role) values (hh, auth.uid(), trim(p_display_name), 'owner');
  insert into public.priority_levels (household_id, level, label, focus) values
    (hh, 1, 'P1', 'Urgent'), (hh, 2, 'P2', 'High'), (hh, 3, 'P3', 'Medium'), (hh, 4, 'P4', 'Low'), (hh, 5, 'P5', 'Someday');
  return hh;
end;
$$;

notify pgrst, 'reload schema';
