-- Add web columns required by the V3 replacement RPC.
-- Additive only. Existing venue data is untouched.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS instagram TEXT;
