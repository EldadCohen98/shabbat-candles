-- Shabbat Candles — one-time migration for an EXISTING database.
-- Adds the city name the user typed, stored next to latitude/longitude.
-- Safe to run more than once.

ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
