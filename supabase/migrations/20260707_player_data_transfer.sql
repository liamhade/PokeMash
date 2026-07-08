-- Adopt an anonymous player's rows into the signed-in account.
--
-- Called by the transfer prompt after a user's first Google sign-in. SECURITY
-- DEFINER because the app only holds the publishable key and RLS grants no
-- UPDATE on comparisons; definer rights also let the function force the
-- destination id to auth.uid() — the caller never chooses it. Possession of
-- the anonymous UUID (an unguessable random id held only in that browser's
-- localStorage) is the proof of ownership of the anonymous history.
create or replace function public.transfer_player_data(anon_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;
  if anon_player = uid then
    return; -- nothing to move
  end if;
  -- Fresh accounts only: two histories can't be merged (Glicko ratings for the
  -- same card would collide), so an account that already has ranks keeps them.
  if exists (select 1 from card_ranks where player_id = uid) then
    raise exception 'account already has data';
  end if;
  update card_ranks set player_id = uid where player_id = anon_player;
  update comparisons set player_id = uid where player_id = anon_player;
end;
$$;

-- Callable only with a session; anonymous visitors have nothing to transfer into.
revoke execute on function public.transfer_player_data(uuid) from public, anon;
grant execute on function public.transfer_player_data(uuid) to authenticated;
