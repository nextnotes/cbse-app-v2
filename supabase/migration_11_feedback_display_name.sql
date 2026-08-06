-- ============================================
-- Migration 11: Public display name for approved feedback
-- Lets admins show something other than the student's real name when a
-- message is approved for public display (e.g. "A Std 8 Student" or a
-- nickname), instead of always showing the real signup name.
-- Run this in Supabase SQL Editor. Safe to run once.
-- ============================================

alter table public.feedback add column if not exists display_name text;
