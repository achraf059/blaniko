-- ============================================================================
-- LOCAL / EMERGENCY REFERENCE ONLY.
-- This file is NOT a migration. It lives outside supabase/migrations/ and is never
-- executed by the Supabase CLI. It reverses 20261007082134_create_user_outings.sql.
--
-- DESTRUCTIVE: dropping a table permanently deletes every user row in it. After the
-- tables hold real data, prefer a forward fix. Roll back in REVERSE order of the
-- migrations (taste profiles -> outings -> collections -> saved venues -> function).
-- A plain DROP (no CASCADE) is used on purpose so a wrong order fails loudly instead
-- of silently dropping dependants.
-- ============================================================================

drop table public.user_outings;
drop function public.is_valid_outing_payload_v1(jsonb);
