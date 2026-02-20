-- ============================================================
-- O+ Dental SaaS — Financial Module
-- Multi-tenant financial system with RLS
-- ============================================================

-- 1. ENUMS
create type public.financial_type as enum ('IN', 'OUT');
create type public.receivable_status as enum ('open', 'paid', 'overdue', 'renegotiated');
create type public.payable_status as enum ('open', 'paid', 'overdue');
create type public.origin_type as enum ('ortho_contract', 'procedure', 'manual', 'installment');
create type public.ortho_status as enum ('active', 'completed', 'cancelled');
create type public.payment_method as enum ('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'other');

-- 2. TABLES

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

-- 3. INDEXES
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

-- 4. ENABLE RLS
alter table public.categories enable row level security;
alter table public.cost_centers enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_entries enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.ortho_contracts enable row level security;
alter table public.recurring_rules enable row level security;

-- 5. RLS POLICIES

-- categories
create policy "categories_select" on public.categories
  for select using (clinic_id = public.current_clinic_id());
create policy "categories_insert" on public.categories
  for insert with check (clinic_id = public.current_clinic_id());
create policy "categories_update" on public.categories
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "categories_delete" on public.categories
  for delete using (clinic_id = public.current_clinic_id());

-- cost_centers
create policy "cost_centers_select" on public.cost_centers
  for select using (clinic_id = public.current_clinic_id());
create policy "cost_centers_insert" on public.cost_centers
  for insert with check (clinic_id = public.current_clinic_id());
create policy "cost_centers_update" on public.cost_centers
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "cost_centers_delete" on public.cost_centers
  for delete using (clinic_id = public.current_clinic_id());

-- financial_transactions
create policy "financial_transactions_select" on public.financial_transactions
  for select using (clinic_id = public.current_clinic_id());
create policy "financial_transactions_insert" on public.financial_transactions
  for insert with check (clinic_id = public.current_clinic_id());
create policy "financial_transactions_update" on public.financial_transactions
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "financial_transactions_delete" on public.financial_transactions
  for delete using (clinic_id = public.current_clinic_id());

-- financial_entries
create policy "financial_entries_select" on public.financial_entries
  for select using (clinic_id = public.current_clinic_id());
create policy "financial_entries_insert" on public.financial_entries
  for insert with check (clinic_id = public.current_clinic_id());
create policy "financial_entries_delete" on public.financial_entries
  for delete using (clinic_id = public.current_clinic_id());

-- receivables
create policy "receivables_select" on public.receivables
  for select using (clinic_id = public.current_clinic_id());
create policy "receivables_insert" on public.receivables
  for insert with check (clinic_id = public.current_clinic_id());
create policy "receivables_update" on public.receivables
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "receivables_delete" on public.receivables
  for delete using (clinic_id = public.current_clinic_id());

-- payables
create policy "payables_select" on public.payables
  for select using (clinic_id = public.current_clinic_id());
create policy "payables_insert" on public.payables
  for insert with check (clinic_id = public.current_clinic_id());
create policy "payables_update" on public.payables
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "payables_delete" on public.payables
  for delete using (clinic_id = public.current_clinic_id());

-- ortho_contracts
create policy "ortho_contracts_select" on public.ortho_contracts
  for select using (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_insert" on public.ortho_contracts
  for insert with check (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_update" on public.ortho_contracts
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "ortho_contracts_delete" on public.ortho_contracts
  for delete using (clinic_id = public.current_clinic_id());

-- recurring_rules
create policy "recurring_rules_select" on public.recurring_rules
  for select using (clinic_id = public.current_clinic_id());
create policy "recurring_rules_insert" on public.recurring_rules
  for insert with check (clinic_id = public.current_clinic_id());
create policy "recurring_rules_update" on public.recurring_rules
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "recurring_rules_delete" on public.recurring_rules
  for delete using (clinic_id = public.current_clinic_id());

-- 6. AUTO-SET clinic_id TRIGGERS

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
