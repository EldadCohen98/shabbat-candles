# Shabbat Candles — PostgreSQL setup

`schema.sql` creates the three application tables in a **new, empty PostgreSQL database**.

Tables (18 columns in total):
- `users` (8 columns): account, bcrypt password hash, optional display name (`full_name`), and optional location (`city`, `latitude`, `longitude`).
- `user_alert_settings` (4 columns): one settings row per user (PK and FK: `user_id`).
- `user_alerts` (6 columns): zero or more alerts per user (FK: `user_id`), with a partial index for unread alerts.

The two foreign keys cascade deletes. Timestamp columns use `timestamp without time zone` and hold Israel local time.

## Set up a fresh local database
1. In pgAdmin (or `psql`), create a **new**, empty database (for example `shabbat_candles_portfolio`).
2. Open a Query Tool **on that new database** and run `schema.sql` once.
3. Run `verify.sql` to inspect the resulting 3 tables and constraints.
4. Configure `server/.env` locally (never commit it):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shabbat_candles_portfolio
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

## Upgrading an existing database
Do **not** run `schema.sql` on a database that already has these tables. Run the migrations instead, in this order. Both are idempotent (`ADD COLUMN IF NOT EXISTS`):

1. `migration_add_city.sql` adds `users.city`.
2. `migration_add_full_name.sql` adds `users.full_name`, which is nullable, so existing users keep working.

Back up the database before any change, and never commit database backups or real user data to a public repository.

## Other files
- `verify.sql`: read-only checks to run after `schema.sql` or after the migrations.
