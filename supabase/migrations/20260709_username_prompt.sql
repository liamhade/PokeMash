-- One-time username prompt for new sign-ins.
--
-- ensure_profile defaults display_name to the email local part. We now offer
-- new users a chance to pick a real username on first sign-in, defaulting to
-- that email name if they dismiss. `name_chosen` records that the offer has
-- been resolved (saved or skipped) so the prompt fires exactly once, ever —
-- server-side state, not a per-browser flag, so it survives across devices and
-- is race-free against the two components that call ensure_profile.

alter table public.profiles
  add column name_chosen boolean not null default false;

-- Existing profiles predate the prompt; treat their email-derived name as
-- already resolved so returning users aren't re-prompted. New rows keep the
-- column default (false) and get the prompt on first sign-in.
update public.profiles set name_chosen = true;

-- The client owns the username UI, so let it flip name_chosen alongside
-- display_name (column grants are additive to the existing display_name/avatar
-- grant). Worst a client can do is re-show or skip its own prompt — harmless.
grant update (name_chosen) on public.profiles to authenticated;
