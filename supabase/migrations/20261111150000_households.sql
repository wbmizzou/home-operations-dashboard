-- Multi-household: anyone can sign up and track their own home. Every project,
-- category and service log belongs to one household, and row-level security
-- limits each signed-in user to their own household's data.

-- ------------------------------------------------------------------ tables
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  -- Share this code (or the invite link) so a partner can join the household.
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  -- 'hollow' = the custom illustration of the original house; everyone else gets the cottage.
  hero text not null default 'cottage' check (hero in ('cottage', 'hollow')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade, -- one household per person
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Pending invites by email: whoever signs up with this email joins the household automatically.
create table public.household_invites (
  email text primary key check (email = lower(email)),
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null
);

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security; -- no policies: only reachable via functions

-- ------------------------------------------------------------------ helpers
create function public.current_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

-- ------------------------------------------------------- existing household
-- The original home: Will now, Natalie automatically when she signs up.
do $$
declare hh uuid; will uuid;
begin
  select id into will from auth.users where email = 'wbmizzou@gmail.com';
  insert into public.households (name, hero, created_by) values ('Home Hollow', 'hollow', will) returning id into hh;
  if will is not null then
    insert into public.household_members (household_id, user_id, display_name, role) values (hh, will, 'Will', 'owner');
  end if;
  insert into public.household_invites (email, household_id, display_name)
  select 'natgramling@gmail.com', hh, 'Natalie'
  where not exists (select 1 from auth.users where email = 'natgramling@gmail.com');
  insert into public.household_members (household_id, user_id, display_name, role)
  select hh, id, 'Natalie', 'member' from auth.users where email = 'natgramling@gmail.com';

  alter table public.projects     add column household_id uuid references public.households (id) on delete cascade;
  alter table public.categories   add column household_id uuid references public.households (id) on delete cascade;
  alter table public.service_logs add column household_id uuid references public.households (id) on delete cascade;
  update public.projects     set household_id = hh;
  update public.categories   set household_id = hh;
  update public.service_logs set household_id = hh;
end $$;

alter table public.projects     alter column household_id set not null, alter column household_id set default public.current_household_id();
alter table public.categories   alter column household_id set not null, alter column household_id set default public.current_household_id();
alter table public.service_logs alter column household_id set not null, alter column household_id set default public.current_household_id();
create index projects_household_idx     on public.projects (household_id);
create index categories_household_idx   on public.categories (household_id);
create index service_logs_household_idx on public.service_logs (household_id);

-- Category names are unique per household, not globally.
drop index public.categories_name_key;
create unique index categories_household_name_key on public.categories (household_id, lower(name));

-- Owners are now the household's members (plus "Joint"), not a fixed list.
alter table public.projects drop constraint projects_owner_check;
alter table public.projects add constraint projects_owner_check check (owner is null or length(trim(owner)) between 1 and 40);

-- References must stay inside the same household.
create function public.enforce_same_household()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'projects' then
    if new.category_id is not null and not exists (select 1 from public.categories where id = new.category_id and household_id = new.household_id) then
      raise exception 'Category belongs to another household';
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
create trigger projects_same_household before insert or update on public.projects
  for each row execute function public.enforce_same_household();
create trigger service_logs_same_household before insert or update on public.service_logs
  for each row execute function public.enforce_same_household();

-- ---------------------------------------------------------------------- RLS
drop policy household_all on public.categories;
drop policy household_all on public.projects;
drop policy household_all on public.service_logs;

create policy own_household on public.categories   for all to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
create policy own_household on public.projects     for all to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
create policy own_household on public.service_logs for all to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());

create policy read_own on public.households for select to authenticated using (id = public.current_household_id());
create policy rename_own on public.households for update to authenticated
  using (id = public.current_household_id()) with check (id = public.current_household_id());
create policy read_members on public.household_members for select to authenticated using (household_id = public.current_household_id());
create policy edit_own_name on public.household_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and household_id = public.current_household_id());
-- Column-level: members may only change their own display name.
revoke update on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;
revoke update on public.households from authenticated;
grant update (name) on public.households to authenticated;

-- ------------------------------------------------- open sign-ups (allow-list gone)
drop trigger enforce_email_allowlist on auth.users;
drop function public.enforce_email_allowlist();
drop function public.is_allowed_user();
drop table public.allowed_emails;

-- ---------------------------------------------------------- app functions
-- The signed-in member's display name (used for "Mine" and as an owner option).
create or replace function public.current_owner()
returns text language sql stable security definer set search_path = public as $$
  select display_name from public.household_members where user_id = auth.uid();
$$;

create function public.create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.current_household_id() is not null then raise exception 'You already belong to a household'; end if;
  insert into public.households (name, created_by) values (trim(p_name), auth.uid()) returning id into hh;
  insert into public.household_members (household_id, user_id, display_name, role) values (hh, auth.uid(), trim(p_display_name), 'owner');
  return hh;
end;
$$;

create function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.current_household_id() is not null then raise exception 'You already belong to a household'; end if;
  select id into hh from public.households where invite_code = upper(trim(p_code));
  if hh is null then raise exception 'That invite code doesn''t match a household'; end if;
  insert into public.household_members (household_id, user_id, display_name) values (hh, auth.uid(), trim(p_display_name));
  return hh;
end;
$$;

-- Joins the household that invited this email, if any. Safe to call on every visit.
create function public.claim_email_invite()
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.household_invites;
begin
  if auth.uid() is null then return null; end if;
  if public.current_household_id() is not null then return public.current_household_id(); end if;
  select * into inv from public.household_invites where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if inv.email is null then return null; end if;
  insert into public.household_members (household_id, user_id, display_name) values (inv.household_id, auth.uid(), inv.display_name);
  delete from public.household_invites where email = inv.email;
  return inv.household_id;
end;
$$;

create function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  update public.households set invite_code = code where id = public.current_household_id();
  return code;
end;
$$;

-- Deletes the caller's account. If they were the last member, the household and
-- all of its projects, categories and service logs go with it.
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare hh uuid := public.current_household_id();
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.household_members where user_id = auth.uid();
  if hh is not null and not exists (select 1 from public.household_members where household_id = hh) then
    delete from public.households where id = hh;
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.current_household_id(), public.current_owner(), public.create_household(text, text),
  public.join_household(text, text), public.claim_email_invite(), public.regenerate_invite_code(), public.delete_my_account(),
  public.enforce_same_household() from public, anon;
grant execute on function public.current_household_id(), public.current_owner(), public.create_household(text, text),
  public.join_household(text, text), public.claim_email_invite(), public.regenerate_invite_code(), public.delete_my_account()
  to authenticated;
