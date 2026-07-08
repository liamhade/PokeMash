-- Profiles + friendships for signed-in players.
--
-- A profile is created on first sign-in (ensure_profile) and carries the
-- player's chosen avatar, a display name (defaulted from the email local
-- part), and a shareable friend code. Friends are added by exchanging codes
-- (add_friend), never by searching emails — so no user is discoverable unless
-- they chose to hand someone their code. A friendship is one canonical row
-- (user_a < user_b) and is mutual by construction: entering someone's code is
-- both the request and the consent, since they gave it to you.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text check (avatar is null or char_length(avatar) <= 32),
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.friendships (
  user_a uuid not null references public.profiles (user_id) on delete cascade,
  user_b uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  -- One row per pair, in canonical order — no (b, a) duplicate to keep in sync.
  constraint friendships_canonical_order check (user_a < user_b)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

-- You can read your own profile and your friends' (the friends page shows
-- their name + avatar). Nobody else's — lookup by code goes through
-- add_friend, so the table can't be scraped.
create policy "read own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());

create policy "read friends profiles" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.friendships f
      where (f.user_a = auth.uid() and f.user_b = profiles.user_id)
         or (f.user_b = auth.uid() and f.user_a = profiles.user_id)
    )
  );

create policy "update own profile" on public.profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "remove own friendships" on public.friendships
  for delete to authenticated using (auth.uid() in (user_a, user_b));

-- Writes go through the definer functions below; the client may only update
-- the two profile columns it owns the UI for (never friend_code).
revoke all on public.profiles from anon;
revoke all on public.friendships from anon;
revoke insert, delete on public.profiles from authenticated;
revoke insert, update on public.friendships from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;

-- Idempotent: called on every sign-in, creates the profile once. The friend
-- code alphabet drops 0/O/1/I/L so codes survive being read aloud.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;
  if exists (select 1 from profiles p where p.user_id = uid) then
    return;
  end if;
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * 31)::int, 1), '')
      into code from generate_series(1, 8);
    exit when not exists (select 1 from profiles p where p.friend_code = code);
  end loop;
  insert into profiles (user_id, display_name, friend_code)
  values (
    uid,
    coalesce(
      nullif(split_part((select email from auth.users where id = uid), '@', 1), ''),
      'Trainer'
    ),
    code
  )
  on conflict (user_id) do nothing;
end;
$$;

-- Add a friend by their code. Definer so the code lookup works without a
-- public select policy on profiles; returns the new friend's public info so
-- the client can confirm who was added. Raises on: not signed in, unknown
-- code, own code. Adding an existing friend is a no-op that still returns them.
create or replace function public.add_friend(code text)
returns table (user_id uuid, display_name text, avatar text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target profiles%rowtype;
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;
  select p.* into target
  from profiles p
  where p.friend_code = upper(trim(add_friend.code));
  if not found then
    raise exception 'no player with that code';
  end if;
  if target.user_id = uid then
    raise exception 'that is your own code';
  end if;
  insert into friendships (user_a, user_b)
  values (least(uid, target.user_id), greatest(uid, target.user_id))
  on conflict do nothing;
  return query select target.user_id, target.display_name, target.avatar;
end;
$$;

revoke execute on function public.ensure_profile() from public, anon;
revoke execute on function public.add_friend(text) from public, anon;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.add_friend(text) to authenticated;
