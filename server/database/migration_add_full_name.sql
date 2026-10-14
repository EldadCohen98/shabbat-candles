-- Shabbat Candles — one-time migration for an EXISTING database.
-- Adds an optional display name. It is not a login identifier and need not be unique.
-- Nullable so existing users keep working. Safe to run more than once.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
