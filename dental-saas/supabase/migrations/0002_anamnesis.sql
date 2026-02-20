-- ============================================================
-- 0002: Anamnesis table for patient health history + alerts
-- ============================================================

-- anamnesis (one per patient, updated over time)
create table public.anamnesis (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  -- Health questions (boolean flags)
  has_allergy           boolean not null default false,
  allergy_details       text not null default '',
  has_heart_disease     boolean not null default false,
  heart_details         text not null default '',
  has_diabetes          boolean not null default false,
  diabetes_details      text not null default '',
  has_hypertension      boolean not null default false,
  hypertension_details  text not null default '',
  has_bleeding_disorder boolean not null default false,
  bleeding_details      text not null default '',
  uses_medication       boolean not null default false,
  medication_details    text not null default '',
  is_pregnant           boolean not null default false,
  is_smoker             boolean not null default false,
  other_conditions      text not null default '',
  -- Alert flag: if true, shows popup on patient open
  has_alert             boolean not null default false,
  alert_message         text not null default '',
  -- Meta
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  -- One anamnesis per patient per clinic
  unique(patient_id)
);

create index idx_anamnesis_patient on public.anamnesis(patient_id);
create index idx_anamnesis_clinic on public.anamnesis(clinic_id);

-- RLS
alter table public.anamnesis enable row level security;

create policy "anamnesis_select" on public.anamnesis
  for select using (clinic_id = public.current_clinic_id());

create policy "anamnesis_insert" on public.anamnesis
  for insert with check (clinic_id = public.current_clinic_id());

create policy "anamnesis_update" on public.anamnesis
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy "anamnesis_delete" on public.anamnesis
  for delete using (clinic_id = public.current_clinic_id());

-- Auto-set clinic_id trigger
create trigger trg_anamnesis_set_clinic
  before insert on public.anamnesis
  for each row execute function public.set_clinic_id();
