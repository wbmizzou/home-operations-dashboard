-- Outlook-style repeat pattern for recurring upkeep (daily / weekly / monthly / yearly,
-- with a start date and an optional end). Additive and nullable: older app versions ignore it.
alter table public.projects add column if not exists recurrence jsonb;
