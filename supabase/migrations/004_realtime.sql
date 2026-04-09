-- ============================================================
-- ARQUIVO: supabase/migrations/004_realtime.sql
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
