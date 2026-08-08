-- Migration: Drop the one-time V3 replacement RPC after successful import.
-- Run this AFTER the V3 import has been verified in production.

DROP FUNCTION IF EXISTS replace_venues_v3(JSONB);
