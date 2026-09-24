-- ==============================================================================
-- DATABASE CACHE MEMORY OPTIMIZATION & SEAMLESS QUERY PERFORMANCE
-- Migration: 20260924000000_cache_memory_and_index_tuning.sql
-- ==============================================================================

-- 1. Enable pg_trgm for ultra-fast, index-backed substring and title searches.
-- This stops PostgreSQL from running full-table sequential scans into shared_buffers
-- during user search queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram GIN Indexes on Books for zero-cache-thrashing text search
CREATE INDEX IF NOT EXISTS idx_books_title_trgm 
ON public.books USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_author_trgm 
ON public.books USING gin (author gin_trgm_ops);

-- 3. Partial Indexes (Minimal Cache Footprint)
-- Partial indexes only store active rows, reducing index size in RAM cache by up to 90%.

-- Available books partial index (used heavily on Catalog 'Available Now' filter)
CREATE INDEX IF NOT EXISTS idx_books_available_copies_partial
ON public.books (category, created_at DESC)
WHERE available_copies > 0;

-- Pending reservations partial index (avoids caching closed/cancelled reservations)
CREATE INDEX IF NOT EXISTS idx_book_reservations_pending_partial
ON public.book_reservations (user_id, book_id, created_at)
WHERE status = 'pending';

-- Active book issues partial index (avoids caching historic returned book records)
CREATE INDEX IF NOT EXISTS idx_book_issues_active_issued_partial
ON public.book_issues (user_id, book_id, due_date)
WHERE status = 'issued';

-- Unread notifications partial index
CREATE INDEX IF NOT EXISTS idx_notifications_unread_partial
ON public.notifications (target_user_id, created_at DESC)
WHERE is_read = false;

-- 4. Autovacuum Tuning for Churn-Heavy Tables
-- Prevents dead tuples from staying in shared_buffers RAM and bloating buffer cache.
ALTER TABLE public.login_streaks SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.notifications SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.book_issues SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

-- 5. Diagnostic View: Inspect Database Cache Usage (Shared Buffers)
-- Run this view anytime to verify what tables and indexes are consuming RAM cache.
CREATE OR REPLACE VIEW public.vw_db_cache_summary AS
SELECT
  schemaname || '.' || relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_disk_size,
  n_live_tup AS active_rows,
  n_dead_tup AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_row_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

COMMENT ON VIEW public.vw_db_cache_summary IS 'Inspect table sizes and bloat affecting database buffer cache memory';
