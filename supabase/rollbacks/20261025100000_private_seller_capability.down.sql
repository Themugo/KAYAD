-- Rollback of 20261025100000_private_seller_capability.sql. Drops only the additive table. Backfilled rows are copies of users.status,
-- so no information is lost for legacy sellers; application rows (source='application') for role=user accounts WOULD be lost:
-- export them first (SELECT * FROM public.private_seller_capabilities WHERE source = 'application').
DROP TABLE IF EXISTS public.private_seller_capabilities;
