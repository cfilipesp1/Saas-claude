-- ============================================================
-- O+ Dental SaaS — Budgets (Orçamentos) Module
-- ============================================================

-- budgets (orçamentos)
create table public.budgets (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  patient_id        uuid references public.patients(id) on delete set null,
  type              text not null check (type in ('ORTHO', 'SPECIALTY')),
  ortho_type        text check (ortho_type in ('TRADICIONAL', 'INVISALIGN')),
  model             text not null default '',
  monthly_value     numeric(12,2) not null default 0,
  installments      integer not null default 36,
  total             numeric(12,2) not null default 0,
  cash_value        numeric(12,2) not null default 0,
  upsells           jsonb not null default '[]',
  items             jsonb not null default '[]',
  due_day           integer check (due_day between 1 and 28),
  is_cash           boolean not null default false,
  is_plan_complement boolean not null default false,
  notes             text not null default '',
  status            text not null default 'pending' check (status in ('pending', 'approved', 'cancelled')),
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- indexes
create index idx_budgets_clinic on public.budgets(clinic_id);
create index idx_budgets_patient on public.budgets(patient_id);
create index idx_budgets_status on public.budgets(status);

-- RLS
alter table public.budgets enable row level security;

create policy "budgets_select" on public.budgets
  for select using (clinic_id = public.current_clinic_id());
create policy "budgets_insert" on public.budgets
  for insert with check (clinic_id = public.current_clinic_id());
create policy "budgets_update" on public.budgets
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "budgets_delete" on public.budgets
  for delete using (clinic_id = public.current_clinic_id());

-- trigger
create trigger trg_budgets_set_clinic
  before insert on public.budgets
  for each row execute function public.set_clinic_id();
