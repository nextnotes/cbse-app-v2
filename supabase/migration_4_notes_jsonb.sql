-- ============================================
-- Migration 4: notes column becomes jsonb
-- Lets "notes" store either a plain string (manual entry, or older chapters)
-- or a structured object (AI-generated styled template with headings,
-- timeline, tables, callouts, glossary, recap).
-- Run this in Supabase SQL Editor. Safe to run once — existing plain-text
-- notes are automatically preserved as JSON strings.
-- ============================================

alter table public.content
  alter column notes type jsonb using to_jsonb(notes);
