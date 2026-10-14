-- Read-only checks: run after schema.sql or after the migrations, in the same database.
-- Expect 3 application tables with 8, 4, and 6 columns respectively.

SELECT table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'user_alert_settings', 'user_alerts')
GROUP BY table_name
ORDER BY table_name;

-- Inspect each column's type, nullable flag and default.
SELECT table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'user_alert_settings', 'user_alerts')
ORDER BY table_name, ordinal_position;

-- Verify primary keys, unique constraints, foreign keys, and checks.
SELECT conrelid::regclass AS table_name,
       conname AS constraint_name,
       contype AS constraint_type,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.users'::regclass,
                   'public.user_alert_settings'::regclass,
                   'public.user_alerts'::regclass)
ORDER BY table_name::text, constraint_name;

-- Inspect indexes used by the project.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_alert_settings', 'user_alerts')
ORDER BY tablename, indexname;
