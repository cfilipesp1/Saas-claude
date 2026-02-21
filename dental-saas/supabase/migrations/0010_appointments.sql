-- ============================================================
-- O+ Dental SaaS — Módulo Agenda
-- Migration 0010: Tabela appointments com RLS multi-tenant
-- ============================================================

-- ─── ENUM: status do agendamento ────────────────────────────
create type public.appointment_status as enum (
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- ─── TABELA: appointments ───────────────────────────────────
create table public.appointments (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  patient_id  uuid references public.patients(id) on delete set null,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  title       text not null default '',
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  status      public.appointment_status not null default 'scheduled',
  notes       text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint chk_appointments_time check (end_at > start_at)
);

-- ─── TRIGGER: auto clinic_id ────────────────────────────────
create or replace function public.set_appointment_clinic_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.clinic_id := public.current_clinic_id();
  if new.clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;
  return new;
end;
$$;

create trigger trg_appointments_set_clinic
  before insert on public.appointments
  for each row execute function public.set_appointment_clinic_id();

-- ─── TRIGGER: updated_at ────────────────────────────────────
drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ─── RLS: Habilitar ─────────────────────────────────────────
alter table public.appointments enable row level security;

-- SELECT: todos os roles podem ver agendamentos da clínica
create policy "appointments_select" on public.appointments
  for select using (
    clinic_id = public.current_clinic_id()
  );

-- INSERT: OWNER, ADMIN, MANAGER, RECEPTION podem criar
create policy "appointments_insert" on public.appointments
  for insert with check (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTION')
  );

-- UPDATE: OWNER, ADMIN, MANAGER, RECEPTION podem editar
create policy "appointments_update" on public.appointments
  for update using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTION')
  );

-- DELETE: somente OWNER, ADMIN, MANAGER podem excluir
create policy "appointments_delete" on public.appointments
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- ─── INDEXES ────────────────────────────────────────────────
create index if not exists idx_appointments_clinic_start
  on public.appointments(clinic_id, start_at);

create index if not exists idx_appointments_clinic_professional
  on public.appointments(clinic_id, professional_id);

create index if not exists idx_appointments_clinic_patient
  on public.appointments(clinic_id, patient_id);

create index if not exists idx_appointments_clinic_status
  on public.appointments(clinic_id, status);
