-- ============================================
-- Migration 10: Public approval flag for feedback
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

alter table public.feedback add column if not exists approved boolean not null default false;
