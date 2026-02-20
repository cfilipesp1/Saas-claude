-- ============================================================
-- Migration: Align patients table with registration form
-- Adds: codigo, address, responsavel_clinico_id, responsavel_orto_id
-- Removes: cpf, notes (not used in the form)
-- ============================================================

-- 1. Add new columns
alter table public.patients add column if not exists codigo text not null default '';
alter table public.patients add column if not exists address text not null default '';
alter table public.patients add column if not exists responsavel_clinico_id text not null default '';
alter table public.patients add column if not exists responsavel_orto_id text not null default '';

-- 2. Remove unused columns
alter table public.patients drop column if exists cpf;
alter table public.patients drop column if exists notes;
