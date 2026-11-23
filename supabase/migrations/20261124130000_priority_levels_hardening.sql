-- Bring priority_levels in line with the security hardening applied to the other household tables:
-- separate per-action policies, owner-only delete (like categories), and the two-step sign-in rule.
drop policy if exists own_household on public.priority_levels;

drop policy if exists household_select on public.priority_levels;
create policy household_select on public.priority_levels for select to authenticated
  using (household_id = public.current_household_id());
drop policy if exists household_insert on public.priority_levels;
create policy household_insert on public.priority_levels for insert to authenticated
  with check (household_id = public.current_household_id());
drop policy if exists household_update on public.priority_levels;
create policy household_update on public.priority_levels for update to authenticated
  using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
drop policy if exists household_delete on public.priority_levels;
create policy household_delete on public.priority_levels for delete to authenticated
  using (household_id = public.current_household_id() and public.is_household_owner());

drop policy if exists require_mfa on public.priority_levels;
create policy require_mfa on public.priority_levels as restrictive for all to authenticated
  using (public.mfa_satisfied()) with check (public.mfa_satisfied());

revoke truncate, references, trigger on public.priority_levels from anon, authenticated;
revoke all on public.priority_levels from anon;

notify pgrst, 'reload schema';
