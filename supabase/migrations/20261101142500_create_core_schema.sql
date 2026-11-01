-- Home Operations Dashboard: initial schema
-- Two-user app (Will + Natalie). Access is limited by an email allow-list,
-- enforced both at sign-up (auth trigger) and in row-level security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- allow-list
create table public.allowed_emails (
  email text primary key check (email = lower(email))
);
alter table public.allowed_emails enable row level security;
-- No policies: nobody can read/write via the API. Managed only by migrations.

insert into public.allowed_emails (email) values
  ('wbmizzou@gmail.com'),
  ('natgramling@gmail.com');

create function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Reject sign-ups from any email that is not on the allow-list.
create function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Sign-ups are limited to household members.';
  end if;
  return new;
end;
$$;

create trigger enforce_email_allowlist
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-- ---------------------------------------------------------------- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create unique index categories_name_key on public.categories (lower(name));

-- ------------------------------------------------------------------ projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  category_id uuid references public.categories (id) on delete set null,
  -- 1 Protect the house, 2 Prevent deterioration, 3 Restore the landscape,
  -- 4 Improve enjoyment, 5 Longer-term upgrades
  priority smallint not null default 3 check (priority between 1 and 5),
  seasons text[] not null default '{}'
    check (seasons <@ array['Spring','Summer','Fall','Winter','Anytime']),
  diy_hire text check (diy_hire in ('DIY','Hire','Purchase')),
  owner text check (owner in ('Will','Joint','Natalie')),
  status text not null default 'Not Started' check (status in (
    'Not Started','Researching','Getting Quotes','Scheduled','In Progress',
    'Waiting','Recurring','Planned','Wishlist','Complete')),
  target_date date,
  target_note text,
  notes text,
  estimated_cost numeric(12,2) check (estimated_cost >= 0),
  quoted_cost numeric(12,2) check (quoted_cost >= 0),
  actual_cost numeric(12,2) check (actual_cost >= 0),
  blocked_by uuid references public.projects (id) on delete set null
    check (blocked_by is distinct from id),
  -- recurring maintenance
  recurrence_months smallint check (recurrence_months > 0),
  completed_on date,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_status_idx on public.projects (status);
create index projects_category_idx on public.projects (category_id);
create index projects_priority_idx on public.projects (priority);

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- service logs
-- One row per completed run of a recurring project (HVAC service, etc.).
create table public.service_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  performed_on date not null default current_date,
  cost numeric(12,2) check (cost >= 0),
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index service_logs_project_idx on public.service_logs (project_id, performed_on desc);

-- ---------------------------------------------------------------------- RLS
alter table public.categories   enable row level security;
alter table public.projects     enable row level security;
alter table public.service_logs enable row level security;

create policy household_all on public.categories
  for all to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy household_all on public.projects
  for all to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy household_all on public.service_logs
  for all to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());

-- Dashboard totals in one place: resale-value spend = final cost of completed
-- projects + every logged recurring service.
create view public.spend_summary with (security_invoker = true) as
select
  coalesce((select sum(actual_cost) from public.projects where status = 'Complete'), 0)
  + coalesce((select sum(cost) from public.service_logs), 0) as total_spent;
