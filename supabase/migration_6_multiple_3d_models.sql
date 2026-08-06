-- ============================================
-- Migration 6: Multiple 3D models per chapter
-- Adds a new column that stores an array of models instead of just one.
-- Old chapters keep working via model_3d_path / model_3d_url (unchanged);
-- new chapters use model_3d_links going forward.
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

alter table public.content add column if not exists model_3d_links jsonb default '[]';
