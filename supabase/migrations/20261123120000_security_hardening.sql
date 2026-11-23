-- Security hardening from the Nov 2026 OWASP Top 10 review.
--  * Invite codes: 12 characters (60 bits), expire after 14 days, single-use, and repeated wrong guesses are throttled.
--  * Household owners can remove members; only owners rename the household or make a new invite code.
--  * Deleting is two-step: projects go to Recently deleted first. Only owners can delete one forever;
--    otherwise it's purged 30 days later. The deleted date is stamped by the database, not the browser.
--  * created_by is always the signed-in user.
--  * Email invites are only claimed by a confirmed email address.
--  * An activity log records joins, removals, renames, new invite codes, deletes and restores.
--  * Two-step sign-in (TOTP): once someone turns it on, their data needs a two-step session (aal2).

-- ------------------------------------------------------------------ helpers
create or replace function public.is_household_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where user_id = auth.uid() and role = 'owner');
$$;

-- True unless the user has a verified two-step factor and this session hasn't used it.
create or replace function public.mfa_satisfied()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified');
$$;

-- 12 characters of Crockford base32 (no I, L, O, U): 60 random bits. Every byte used is
-- fully random (the UUID version and variant bytes are skipped).
create or replace function public.new_invite_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  code text := '';
begin
  for i in 0..11 loop
    code := code || substr(alphabet, (get_byte(b, i * 2 + 1) & 31) + 1, 1);
  end loop;
  return code;
end;
$$;

-- Accept codes typed with spaces/dashes and the usual look-alikes (O→0, I/L→1).
create or replace function public.normalize_invite_code(p text)
returns text language sql immutable set search_path = public as $$
  select translate(upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g')), 'OIL', '011');
$$;

-- ------------------------------------------------------------- invite codes
alter table public.households
  add column if not exists invite_expires_at timestamptz not null default now() + interval '14 days';
alter table public.households alter column invite_code set default public.new_invite_code();
-- Retire the old 8-character codes now (any unused invite link from before this change stops working).
update public.households set invite_code = public.new_invite_code(), invite_expires_at = now() + interval '14 days';

-- Failed join attempts, for throttling guesses. No policies: only reachable through join_household.
create table if not exists public.invite_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists invite_attempts_user_idx on public.invite_attempts (user_id, attempted_at desc);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from anon, authenticated;

-- Returns the household joined, or null when the code is wrong or expired. (A wrong code returns
-- null rather than raising so that the failed attempt is recorded.)
create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid; fails int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.current_household_id() is not null then raise exception 'You already belong to a household'; end if;
  select count(*) into fails from public.invite_attempts where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if fails >= 10 then raise exception 'Too many tries. Wait an hour, or ask for a fresh invite link.'; end if;

  select id into hh from public.households
  where invite_code = public.normalize_invite_code(p_code) and invite_expires_at > now();
  if hh is null then
    insert into public.invite_attempts (user_id) values (auth.uid());
    return null;
  end if;

  insert into public.household_members (household_id, user_id, display_name) values (hh, auth.uid(), trim(p_display_name));
  delete from public.invite_attempts where user_id = auth.uid();
  -- Single use: the next person needs a fresh code, so a leaked link can't be reused.
  perform set_config('app.code_used', '1', true); -- logged as "joined", not as a new code
  update public.households set invite_code = public.new_invite_code(), invite_expires_at = now() + interval '14 days' where id = hh;
  return hh;
end;
$$;

create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare code text := public.new_invite_code();
begin
  if not public.is_household_owner() then raise exception 'Only the household owner can make a new invite code'; end if;
  if not public.mfa_satisfied() then raise exception 'Two-step verification required'; end if;
  update public.households set invite_code = code, invite_expires_at = now() + interval '14 days'
  where id = public.current_household_id();
  return code;
end;
$$;

-- Joins the household that invited this email, if any, once the email address is confirmed.
create or replace function public.claim_email_invite()
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.household_invites; confirmed_email text;
begin
  if auth.uid() is null then return null; end if;
  if public.current_household_id() is not null then return public.current_household_id(); end if;
  select lower(email) into confirmed_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if confirmed_email is null then return null; end if;
  select * into inv from public.household_invites where email = confirmed_email;
  if inv.email is null then return null; end if;
  insert into public.household_members (household_id, user_id, display_name) values (inv.household_id, auth.uid(), inv.display_name);
  delete from public.household_invites where email = inv.email;
  return inv.household_id;
end;
$$;

-- ------------------------------------------------------------- membership
create or replace function public.remove_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_household_owner() then raise exception 'Only the household owner can remove members'; end if;
  if not public.mfa_satisfied() then raise exception 'Two-step verification required'; end if;
  if p_user_id = auth.uid() then raise exception 'To leave, delete your account in Settings'; end if;
  delete from public.household_members where user_id = p_user_id and household_id = public.current_household_id();
  if not found then raise exception 'That person isn''t in your household'; end if;
end;
$$;

-- Deletes the caller's account. The last member takes the household (and all its data) with them;
-- otherwise, if the owner leaves, the longest-standing member becomes the owner.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare hh uuid := public.current_household_id();
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.mfa_satisfied() then raise exception 'Two-step verification required'; end if;
  delete from public.household_members where user_id = auth.uid();
  if hh is not null then
    if not exists (select 1 from public.household_members where household_id = hh) then
      delete from public.households where id = hh;
      delete from public.audit_log where household_id = hh;
    elsif not exists (select 1 from public.household_members where household_id = hh and role = 'owner') then
      update public.household_members set role = 'owner'
      where household_id = hh and user_id = (select user_id from public.household_members where household_id = hh order by joined_at limit 1);
    end if;
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ------------------------------------------------------- server-set columns
-- deleted_at is always "now" (or cleared), so nobody can backdate a delete past the 30-day window.
create or replace function public.stamp_deleted_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.deleted_at := null;
  elsif new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := case when new.deleted_at is null then null else now() end;
  end if;
  return new;
end;
$$;
drop trigger if exists projects_stamp_deleted_at on public.projects;
create trigger projects_stamp_deleted_at before insert or update on public.projects
  for each row execute function public.stamp_deleted_at();

-- created_by is always whoever made the row, and never changes.
create or replace function public.stamp_created_by()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
drop trigger if exists projects_stamp_created_by on public.projects;
create trigger projects_stamp_created_by before insert or update on public.projects
  for each row execute function public.stamp_created_by();
drop trigger if exists service_logs_stamp_created_by on public.service_logs;
create trigger service_logs_stamp_created_by before insert or update on public.service_logs
  for each row execute function public.stamp_created_by();

-- ---------------------------------------------------------------------- RLS
-- Projects: no direct hard delete except from Recently deleted, and only by an owner
-- (or once the 30 days are up).
drop policy if exists own_household on public.projects;
drop policy if exists household_select on public.projects;
create policy household_select on public.projects for select to authenticated
  using (household_id = public.current_household_id());
drop policy if exists household_insert on public.projects;
create policy household_insert on public.projects for insert to authenticated
  with check (household_id = public.current_household_id());
drop policy if exists household_update on public.projects;
create policy household_update on public.projects for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
drop policy if exists household_delete on public.projects;
create policy household_delete on public.projects for delete to authenticated
  using (household_id = public.current_household_id() and deleted_at is not null
         and (public.is_household_owner() or deleted_at < now() - interval '30 days'));

-- Categories: the app never deletes them; only an owner may.
drop policy if exists own_household on public.categories;
drop policy if exists household_select on public.categories;
create policy household_select on public.categories for select to authenticated
  using (household_id = public.current_household_id());
drop policy if exists household_insert on public.categories;
create policy household_insert on public.categories for insert to authenticated
  with check (household_id = public.current_household_id());
drop policy if exists household_update on public.categories;
create policy household_update on public.categories for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
drop policy if exists household_delete on public.categories;
create policy household_delete on public.categories for delete to authenticated
  using (household_id = public.current_household_id() and public.is_household_owner());

-- Only the owner renames the household.
drop policy if exists rename_own on public.households;
create policy rename_own on public.households for update to authenticated
  using (id = public.current_household_id() and public.is_household_owner())
  with check (id = public.current_household_id());

-- Supabase's default grants are broader than the app needs; RLS already blocks these, but don't rely on it alone.
revoke insert, delete, truncate, references, trigger on public.households, public.household_members from anon, authenticated;
revoke all on public.household_invites from anon, authenticated;
revoke truncate, references, trigger on public.projects, public.categories, public.service_logs from anon, authenticated;

-- ---------------------------------------------------------- activity log
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  household_id uuid not null, -- no FK: rows must survive the household's own cascade long enough to be skipped
  actor uuid default auth.uid(),
  actor_name text,
  action text not null,
  detail text,
  at timestamptz not null default now()
);
create index if not exists audit_log_household_idx on public.audit_log (household_id, at desc);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists read_own on public.audit_log;
create policy read_own on public.audit_log for select to authenticated
  using (household_id = public.current_household_id());

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hh uuid := coalesce((case when tg_op = 'DELETE' then null else to_jsonb(new) end) ->> (case when tg_table_name = 'households' then 'id' else 'household_id' end),
                      to_jsonb(old) ->> (case when tg_table_name = 'households' then 'id' else 'household_id' end))::uuid;
  who text := coalesce((select display_name from public.household_members where user_id = auth.uid()),
                       case when auth.uid() is null then 'Automatic cleanup' else 'Someone' end);
  act text; det text;
begin
  -- Skip when the whole household is being deleted (cascade).
  if not exists (select 1 from public.households where id = hh) then return null; end if;

  if tg_table_name = 'household_members' then
    if tg_op = 'INSERT' then act := 'joined'; det := new.display_name; who := new.display_name;
    elsif tg_op = 'DELETE' then
      act := case when old.user_id = auth.uid() then 'left' else 'removed member' end; det := old.display_name;
      if old.user_id = auth.uid() then who := old.display_name; end if;
    elsif new.role is distinct from old.role then act := 'became owner'; det := new.display_name; who := new.display_name;
    end if;
  elsif tg_table_name = 'households' then
    if new.name is distinct from old.name then act := 'renamed household'; det := old.name || ' → ' || new.name;
    elsif new.invite_code is distinct from old.invite_code and coalesce(current_setting('app.code_used', true), '') <> '1' then
      act := 'new invite code';
    end if;
  elsif tg_table_name = 'projects' then
    if tg_op = 'DELETE' then act := 'deleted project forever'; det := old.title;
    elsif new.deleted_at is not null and old.deleted_at is null then act := 'deleted project'; det := new.title;
    elsif new.deleted_at is null and old.deleted_at is not null then act := 'restored project'; det := new.title;
    end if;
  end if;

  if act is not null then
    insert into public.audit_log (household_id, actor, actor_name, action, detail) values (hh, auth.uid(), who, act, det);
  end if;
  return null;
end;
$$;
drop trigger if exists household_members_activity on public.household_members;
create trigger household_members_activity after insert or update or delete on public.household_members
  for each row execute function public.log_activity();
drop trigger if exists households_activity on public.households;
create trigger households_activity after update on public.households
  for each row execute function public.log_activity();
drop trigger if exists projects_activity on public.projects;
create trigger projects_activity after update of deleted_at or delete on public.projects
  for each row execute function public.log_activity();

-- Purge also trims the activity log to a year. Safe to expose: deleted_at is server-stamped, so it
-- only ever removes projects that really have sat in Recently deleted for 30 days.
create or replace function public.purge_deleted_projects()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.projects where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from public.audit_log where at < now() - interval '1 year';
  delete from public.invite_attempts where attempted_at < now() - interval '1 day';
  return n;
end;
$$;

-- -------------------------------------------------------- two-step sign-in
-- Restrictive policies are ANDed with the ones above: once someone has turned on two-step
-- sign-in, a password-only session can't read or change anything.
do $$
declare t text;
begin
  foreach t in array array['projects', 'categories', 'service_logs', 'households', 'household_members', 'audit_log'] loop
    execute format('drop policy if exists require_mfa on public.%I', t);
    execute format('create policy require_mfa on public.%I as restrictive for all to authenticated using (public.mfa_satisfied()) with check (public.mfa_satisfied())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- grants
revoke execute on function public.is_household_owner(), public.mfa_satisfied(), public.new_invite_code(),
  public.normalize_invite_code(text), public.remove_member(uuid), public.stamp_deleted_at(), public.stamp_created_by(),
  public.log_activity() from public, anon;
grant execute on function public.is_household_owner(), public.mfa_satisfied(), public.remove_member(uuid) to authenticated;
revoke execute on function public.new_invite_code(), public.normalize_invite_code(text), public.stamp_deleted_at(),
  public.stamp_created_by(), public.log_activity() from authenticated;
