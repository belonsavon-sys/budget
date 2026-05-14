-- Harden the four helper functions:
--   1. Pin search_path to prevent search-path injection.
--   2. Revoke EXECUTE from anon/authenticated/public on functions that should
--      never be callable via PostgREST RPC. They are still invoked safely
--      via triggers (touch_updated_at, add_owner_as_member, attach_touch_trigger)
--      and via RLS policy bodies (user_household_ids), both of which bypass
--      the EXECUTE grant because they run under definer privileges and within
--      the planner respectively.

alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.add_owner_as_member() set search_path = public, pg_temp;
alter function public.attach_touch_trigger(text) set search_path = public, pg_temp;
alter function public.user_household_ids() set search_path = public, pg_temp;

revoke execute on function public.touch_updated_at() from anon, authenticated, public;
revoke execute on function public.add_owner_as_member() from anon, authenticated, public;
revoke execute on function public.attach_touch_trigger(text) from anon, authenticated, public;
revoke execute on function public.user_household_ids() from anon, authenticated, public;
