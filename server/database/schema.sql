-- Shabbat Candles — database schema.
-- Run once on a NEW, EMPTY PostgreSQL database.
-- For an existing database, use the migration_*.sql files instead.

BEGIN;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city VARCHAR(100),
    full_name VARCHAR(100)
);

CREATE TABLE user_alert_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    minutes_before INTEGER NOT NULL DEFAULT 20,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_sent_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE user_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITHOUT TIME ZONE
);

-- Speeds up the unread-alert lookup by user.
CREATE INDEX idx_user_alerts_unread_by_user
    ON user_alerts (user_id) WHERE read_at IS NULL;

COMMIT;
