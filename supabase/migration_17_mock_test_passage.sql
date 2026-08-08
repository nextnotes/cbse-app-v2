-- ============================================
-- Migration 17: Unseen-passage reading comprehension for Mock Tests
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

-- Optional reading passage shown above a mock test's questions. NULL for
-- ordinary (non-comprehension) mock tests — no change needed for those.
alter table public.mock_tests add column if not exists passage text;
