-- Rollback for 20261026100000_admin_alerts.sql.
-- DATA-LOSS WARNING: dropping the table permanently deletes every stored admin alert. Take a backup of public.admin_alerts first
-- (e.g. CREATE TABLE public.admin_alerts_backup_<date> AS TABLE public.admin_alerts) if alerts must be kept. Restoring the table after
-- a drop requires that backup (or a database restore). After rollback GET /api/admin/alerts returns HTTP 500 again (the pre-13G state).
DROP TABLE IF EXISTS public.admin_alerts;
