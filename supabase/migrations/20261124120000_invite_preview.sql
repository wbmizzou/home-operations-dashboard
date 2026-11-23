-- Show which household an invite code belongs to before joining it, so a link from a stranger
-- ("You've been invited…") can't quietly put someone's projects into the wrong household.
-- Wrong or expired codes count toward the same throttle as join_household, so this can't be
-- used to guess codes either.
create or replace function public.preview_invite(p_code text)
returns table (household_name text, owner_name text)
language plpgsql security definer set search_path = public as $$
declare hh uuid; fails int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select count(*) into fails from public.invite_attempts where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if fails >= 10 then raise exception 'Too many tries. Wait an hour, or ask for a fresh invite link.'; end if;

  select id into hh from public.households
  where invite_code = public.normalize_invite_code(p_code) and invite_expires_at > now();
  if hh is null then
    insert into public.invite_attempts (user_id) values (auth.uid());
    return; -- no rows: wrong, used or expired
  end if;

  return query
    select h.name, (select m.display_name from public.household_members m where m.household_id = hh and m.role = 'owner' limit 1)
    from public.households h where h.id = hh;
end;
$$;

revoke execute on function public.preview_invite(text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
