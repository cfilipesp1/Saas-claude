-- ============================================================
-- O+ Dental SaaS — MIGRATION COMPLETA (cole tudo no SQL Editor)
-- ============================================================

-- 1. ENUMS
create type public.user_role as enum (
  'OWNER', 'ADMIN', 'MANAGER', 'RECEPTION', 'PROFESSIONAL'
);

create type public.waitlist_status as enum (
  'NEW', 'CONTACTING', 'SCHEDULED', 'UNREACHABLE', 'NO_SHOW', 'CANCELLED', 'DONE'
);

-- 2. TABLES

create table public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  full_name  text not null default '',
  role       public.user_role not null default 'RECEPTION',
  created_at timestamptz not null default now()
);

create table public.professionals (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  specialty  text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patients (
  id                     uuid primary key default gen_random_uuid(),
  clinic_id              uuid not null references public.clinics(id) on delete cascade,
  codigo                 text not null default '',
  name                   text not null,
  birth_date             date,
  phone                  text not null default '',
  email                  text not null default '',
  address                text not null default '',
  responsavel_clinico_id text not null default '',
  responsavel_orto_id    text not null default '',
  created_at             timestamptz not null default now()
);

create table public.waitlist_entries (
  id                        uuid primary key default gen_random_uuid(),
  clinic_id                 uuid not null references public.clinics(id) on delete cascade,
  patient_id                uuid not null references public.patients(id) on delete cascade,
  specialty                 text not null default '',
  preferred_professional_id uuid references public.professionals(id) on delete set null,
  priority                  integer not null default 0,
  status                    public.waitlist_status not null default 'NEW',
  notes                     text not null default '',
  created_at                timestamptz not null default now()
);

create table public.waitlist_events (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  waitlist_entry_id uuid not null references public.waitlist_entries(id) on delete cascade,
  from_status       public.waitlist_status,
  to_status         public.waitlist_status not null,
  actor_user_id     uuid references auth.users(id) on delete set null,
  note              text not null default '',
  created_at        timestamptz not null default now()
);

create table public.anamnesis (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
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
  has_alert             boolean not null default false,
  alert_message         text not null default '',
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique(patient_id)
);

-- 3. INDEXES
create index idx_profiles_clinic on public.profiles(clinic_id);
create index idx_professionals_clinic on public.professionals(clinic_id);
create index idx_patients_clinic on public.patients(clinic_id);
create index idx_waitlist_entries_clinic on public.waitlist_entries(clinic_id);
create index idx_waitlist_entries_status on public.waitlist_entries(status);
create index idx_waitlist_events_entry on public.waitlist_events(waitlist_entry_id);
create index idx_anamnesis_patient on public.anamnesis(patient_id);
create index idx_anamnesis_clinic on public.anamnesis(clinic_id);

-- 4. HELPER FUNCTION
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.profiles where user_id = auth.uid();
$$;

-- 5. ENABLE RLS
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.waitlist_events enable row level security;
alter table public.anamnesis enable row level security;

-- 6. RLS POLICIES

create policy "clinics_select" on public.clinics
  for select using (id = public.current_clinic_id());
create policy "clinics_update" on public.clinics
  for update using (id = public.current_clinic_id())
  with check (id = public.current_clinic_id());

create policy "profiles_select" on public.profiles
  for select using (user_id = auth.uid());
create policy "profiles_update" on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "professionals_select" on public.professionals
  for select using (clinic_id = public.current_clinic_id());
create policy "professionals_insert" on public.professionals
  for insert with check (clinic_id = public.current_clinic_id());
create policy "professionals_update" on public.professionals
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "professionals_delete" on public.professionals
  for delete using (clinic_id = public.current_clinic_id());

create policy "patients_select" on public.patients
  for select using (clinic_id = public.current_clinic_id());
create policy "patients_insert" on public.patients
  for insert with check (clinic_id = public.current_clinic_id());
create policy "patients_update" on public.patients
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "patients_delete" on public.patients
  for delete using (clinic_id = public.current_clinic_id());

create policy "waitlist_entries_select" on public.waitlist_entries
  for select using (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_insert" on public.waitlist_entries
  for insert with check (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_update" on public.waitlist_entries
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_delete" on public.waitlist_entries
  for delete using (clinic_id = public.current_clinic_id());

create policy "waitlist_events_select" on public.waitlist_events
  for select using (clinic_id = public.current_clinic_id());
create policy "waitlist_events_insert" on public.waitlist_events
  for insert with check (clinic_id = public.current_clinic_id());

create policy "anamnesis_select" on public.anamnesis
  for select using (clinic_id = public.current_clinic_id());
create policy "anamnesis_insert" on public.anamnesis
  for insert with check (clinic_id = public.current_clinic_id());
create policy "anamnesis_update" on public.anamnesis
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "anamnesis_delete" on public.anamnesis
  for delete using (clinic_id = public.current_clinic_id());

-- 7. AUTO-SET clinic_id TRIGGER
create or replace function public.set_clinic_id()
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

create trigger trg_professionals_set_clinic
  before insert on public.professionals
  for each row execute function public.set_clinic_id();

create trigger trg_patients_set_clinic
  before insert on public.patients
  for each row execute function public.set_clinic_id();

create trigger trg_waitlist_entries_set_clinic
  before insert on public.waitlist_entries
  for each row execute function public.set_clinic_id();

create trigger trg_waitlist_events_set_clinic
  before insert on public.waitlist_events
  for each row execute function public.set_clinic_id();

create trigger trg_anamnesis_set_clinic
  before insert on public.anamnesis
  for each row execute function public.set_clinic_id();

-- 8. AUTO-CREATE CLINIC + PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_clinic_id uuid;
begin
  -- Create a new clinic for the user
  insert into public.clinics (id, name)
  values (gen_random_uuid(), coalesce(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
  returning id into new_clinic_id;

  -- Create profile linking user to clinic as OWNER
  insert into public.profiles (user_id, clinic_id, full_name, role)
  values (
    new.id,
    new_clinic_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'),
    'OWNER'
  );

  return new;
end;
$$;

-- Trigger: fires after each new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 9. FINANCIAL MODULE (Módulo Financeiro)
-- ============================================================

-- Financial Enums
create type public.financial_type as enum ('IN', 'OUT');
create type public.receivable_status as enum ('open', 'paid', 'overdue', 'renegotiated');
create type public.payable_status as enum ('open', 'paid', 'overdue');
create type public.origin_type as enum ('ortho_contract', 'procedure', 'manual', 'installment');
create type public.ortho_status as enum ('active', 'completed', 'cancelled');
create type public.payment_method as enum ('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'other');

-- categories (classificação de receitas/despesas)
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  type       public.financial_type not null,
  created_at timestamptz not null default now()
);

-- cost_centers (centros de custo)
create table public.cost_centers (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- financial_transactions (lançamentos financeiros)
create table public.financial_transactions (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics(id) on delete cascade,
  type             public.financial_type not null,
  patient_id       uuid references public.patients(id) on delete set null,
  total_amount     numeric(12,2) not null check (total_amount > 0),
  payment_method   public.payment_method not null default 'cash',
  transaction_date date not null default current_date,
  description      text not null default '',
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- financial_entries (rateio por categoria/centro de custo)
create table public.financial_entries (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  transaction_id  uuid not null references public.financial_transactions(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  cost_center_id  uuid references public.cost_centers(id) on delete set null,
  amount          numeric(12,2) not null check (amount > 0),
  created_at      timestamptz not null default now()
);

-- receivables (contas a receber)
create table public.receivables (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  origin_type     public.origin_type not null default 'manual',
  origin_id       uuid,
  installment_num integer,
  total_installments integer,
  due_date        date not null,
  amount          numeric(12,2) not null check (amount > 0),
  status          public.receivable_status not null default 'open',
  paid_amount     numeric(12,2) not null default 0,
  paid_at         timestamptz,
  description     text not null default '',
  created_at      timestamptz not null default now()
);

-- payables (contas a pagar)
create table public.payables (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  supplier        text not null default '',
  due_date        date not null,
  amount          numeric(12,2) not null check (amount > 0),
  status          public.payable_status not null default 'open',
  paid_amount     numeric(12,2) not null default 0,
  paid_at         timestamptz,
  category_id     uuid references public.categories(id) on delete set null,
  cost_center_id  uuid references public.cost_centers(id) on delete set null,
  description     text not null default '',
  created_at      timestamptz not null default now()
);

-- ortho_contracts (contratos de ortodontia)
create table public.ortho_contracts (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  monthly_amount  numeric(12,2) not null check (monthly_amount > 0),
  total_months    integer not null default 24,
  due_day         integer not null default 10 check (due_day between 1 and 28),
  start_date      date not null,
  status          public.ortho_status not null default 'active',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

-- recurring_rules (regras de recorrência)
create table public.recurring_rules (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  type        text not null check (type in ('receivable', 'payable')),
  entity_id   uuid not null,
  frequency   text not null default 'monthly' check (frequency in ('monthly')),
  next_run    date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Financial Indexes
create index idx_categories_clinic on public.categories(clinic_id);
create index idx_cost_centers_clinic on public.cost_centers(clinic_id);
create index idx_financial_transactions_clinic on public.financial_transactions(clinic_id);
create index idx_financial_transactions_date on public.financial_transactions(transaction_date);
create index idx_financial_transactions_type on public.financial_transactions(type);
create index idx_financial_entries_transaction on public.financial_entries(transaction_id);
create index idx_receivables_clinic on public.receivables(clinic_id);
create index idx_receivables_status on public.receivables(status);
create index idx_receivables_due_date on public.receivables(due_date);
create index idx_receivables_patient on public.receivables(patient_id);
create index idx_payables_clinic on public.payables(clinic_id);
create index idx_payables_status on public.payables(status);
create index idx_payables_due_date on public.payables(due_date);
create index idx_ortho_contracts_clinic on public.ortho_contracts(clinic_id);
create index idx_ortho_contracts_patient on public.ortho_contracts(patient_id);
create index idx_ortho_contracts_status on public.ortho_contracts(status);
create index idx_recurring_rules_clinic on public.recurring_rules(clinic_id);
create index idx_recurring_rules_next_run on public.recurring_rules(next_run);

-- Financial RLS
alter table public.categories enable row level security;
alter table public.cost_centers enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_entries enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.ortho_contracts enable row level security;
alter table public.recurring_rules enable row level security;

create policy "categories_select" on public.categories
  for select using (clinic_id = public.current_clinic_id());
create policy "categories_insert" on public.categories
  for insert with check (clinic_id = public.current_clinic_id());
create policy "categories_update" on public.categories
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "categories_delete" on public.categories
  for delete using (clinic_id = public.current_clinic_id());

create policy "cost_centers_select" on public.cost_centers
  for select using (clinic_id = public.current_clinic_id());
create policy "cost_centers_insert" on public.cost_centers
  for insert with check (clinic_id = public.current_clinic_id());
create policy "cost_centers_update" on public.cost_centers
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "cost_centers_delete" on public.cost_centers
  for delete using (clinic_id = public.current_clinic_id());

create policy "financial_transactions_select" on public.financial_transactions
  for select using (clinic_id = public.current_clinic_id());
create policy "financial_transactions_insert" on public.financial_transactions
  for insert with check (clinic_id = public.current_clinic_id());
create policy "financial_transactions_update" on public.financial_transactions
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "financial_transactions_delete" on public.financial_transactions
  for delete using (clinic_id = public.current_clinic_id());

create policy "financial_entries_select" on public.financial_entries
  for select using (clinic_id = public.current_clinic_id());
create policy "financial_entries_insert" on public.financial_entries
  for insert with check (clinic_id = public.current_clinic_id());
create policy "financial_entries_delete" on public.financial_entries
  for delete using (clinic_id = public.current_clinic_id());

create policy "receivables_select" on public.receivables
  for select using (clinic_id = public.current_clinic_id());
create policy "receivables_insert" on public.receivables
  for insert with check (clinic_id = public.current_clinic_id());
create policy "receivables_update" on public.receivables
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "receivables_delete" on public.receivables
  for delete using (clinic_id = public.current_clinic_id());

create policy "payables_select" on public.payables
  for select using (clinic_id = public.current_clinic_id());
create policy "payables_insert" on public.payables
  for insert with check (clinic_id = public.current_clinic_id());
create policy "payables_update" on public.payables
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "payables_delete" on public.payables
  for delete using (clinic_id = public.current_clinic_id());

create policy "ortho_contracts_select" on public.ortho_contracts
  for select using (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_insert" on public.ortho_contracts
  for insert with check (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_update" on public.ortho_contracts
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_delete" on public.ortho_contracts
  for delete using (clinic_id = public.current_clinic_id());

create policy "recurring_rules_select" on public.recurring_rules
  for select using (clinic_id = public.current_clinic_id());
create policy "recurring_rules_insert" on public.recurring_rules
  for insert with check (clinic_id = public.current_clinic_id());
create policy "recurring_rules_update" on public.recurring_rules
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "recurring_rules_delete" on public.recurring_rules
  for delete using (clinic_id = public.current_clinic_id());

-- Financial triggers
create trigger trg_categories_set_clinic
  before insert on public.categories
  for each row execute function public.set_clinic_id();

create trigger trg_cost_centers_set_clinic
  before insert on public.cost_centers
  for each row execute function public.set_clinic_id();

create trigger trg_financial_transactions_set_clinic
  before insert on public.financial_transactions
  for each row execute function public.set_clinic_id();

create trigger trg_financial_entries_set_clinic
  before insert on public.financial_entries
  for each row execute function public.set_clinic_id();

create trigger trg_receivables_set_clinic
  before insert on public.receivables
  for each row execute function public.set_clinic_id();

create trigger trg_payables_set_clinic
  before insert on public.payables
  for each row execute function public.set_clinic_id();

create trigger trg_ortho_contracts_set_clinic
  before insert on public.ortho_contracts
  for each row execute function public.set_clinic_id();

create trigger trg_recurring_rules_set_clinic
  before insert on public.recurring_rules
  for each row execute function public.set_clinic_id();

-- ============================================================
-- 10. BUDGETS MODULE (Módulo de Orçamentos)
-- ============================================================

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

create index idx_budgets_clinic on public.budgets(clinic_id);
create index idx_budgets_patient on public.budgets(patient_id);
create index idx_budgets_status on public.budgets(status);

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

create trigger trg_budgets_set_clinic
  before insert on public.budgets
  for each row execute function public.set_clinic_id();
