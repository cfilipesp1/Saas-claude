-- ============================================================
-- O+ Dental SaaS — Financial + Budgets (SAFE / IDEMPOTENT)
-- This migration can be run even if enums or partial objects
-- already exist. It uses IF NOT EXISTS and DO blocks.
-- ============================================================

-- ===================== 1. ENUMS (skip if already exist) =====================

DO $$ BEGIN
  CREATE TYPE public.financial_type AS ENUM ('IN', 'OUT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.receivable_status AS ENUM ('open', 'paid', 'overdue', 'renegotiated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payable_status AS ENUM ('open', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.origin_type AS ENUM ('ortho_contract', 'procedure', 'manual', 'installment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ortho_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===================== 2. TABLES (skip if already exist) =====================

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  type       public.financial_type not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
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

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  transaction_id  uuid not null references public.financial_transactions(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  cost_center_id  uuid references public.cost_centers(id) on delete set null,
  amount          numeric(12,2) not null check (amount > 0),
  created_at      timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.receivables (
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

CREATE TABLE IF NOT EXISTS public.payables (
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

CREATE TABLE IF NOT EXISTS public.ortho_contracts (
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

CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  type        text not null check (type in ('receivable', 'payable')),
  entity_id   uuid not null,
  frequency   text not null default 'monthly' check (frequency in ('monthly')),
  next_run    date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
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

-- ===================== 3. INDEXES (IF NOT EXISTS) =====================

CREATE INDEX IF NOT EXISTS idx_categories_clinic ON public.categories(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_clinic ON public.cost_centers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_clinic ON public.financial_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_entries_transaction ON public.financial_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receivables_clinic ON public.receivables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_patient ON public.receivables(patient_id);
CREATE INDEX IF NOT EXISTS idx_payables_clinic ON public.payables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payables_status ON public.payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON public.payables(due_date);
CREATE INDEX IF NOT EXISTS idx_ortho_contracts_clinic ON public.ortho_contracts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ortho_contracts_patient ON public.ortho_contracts(patient_id);
CREATE INDEX IF NOT EXISTS idx_ortho_contracts_status ON public.ortho_contracts(status);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_clinic ON public.recurring_rules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_next_run ON public.recurring_rules(next_run);
CREATE INDEX IF NOT EXISTS idx_budgets_clinic ON public.budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_budgets_patient ON public.budgets(patient_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);

-- ===================== 4. ENABLE RLS =====================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ortho_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- ===================== 5. RLS POLICIES (drop + recreate = idempotent) =====================

-- categories
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (clinic_id = public.current_clinic_id());

-- cost_centers
DROP POLICY IF EXISTS "cost_centers_select" ON public.cost_centers;
CREATE POLICY "cost_centers_select" ON public.cost_centers FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "cost_centers_insert" ON public.cost_centers;
CREATE POLICY "cost_centers_insert" ON public.cost_centers FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "cost_centers_update" ON public.cost_centers;
CREATE POLICY "cost_centers_update" ON public.cost_centers FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "cost_centers_delete" ON public.cost_centers;
CREATE POLICY "cost_centers_delete" ON public.cost_centers FOR DELETE USING (clinic_id = public.current_clinic_id());

-- financial_transactions
DROP POLICY IF EXISTS "financial_transactions_select" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select" ON public.financial_transactions FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "financial_transactions_insert" ON public.financial_transactions;
CREATE POLICY "financial_transactions_insert" ON public.financial_transactions FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "financial_transactions_update" ON public.financial_transactions;
CREATE POLICY "financial_transactions_update" ON public.financial_transactions FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "financial_transactions_delete" ON public.financial_transactions;
CREATE POLICY "financial_transactions_delete" ON public.financial_transactions FOR DELETE USING (clinic_id = public.current_clinic_id());

-- financial_entries
DROP POLICY IF EXISTS "financial_entries_select" ON public.financial_entries;
CREATE POLICY "financial_entries_select" ON public.financial_entries FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "financial_entries_insert" ON public.financial_entries;
CREATE POLICY "financial_entries_insert" ON public.financial_entries FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "financial_entries_delete" ON public.financial_entries;
CREATE POLICY "financial_entries_delete" ON public.financial_entries FOR DELETE USING (clinic_id = public.current_clinic_id());

-- receivables
DROP POLICY IF EXISTS "receivables_select" ON public.receivables;
CREATE POLICY "receivables_select" ON public.receivables FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "receivables_insert" ON public.receivables;
CREATE POLICY "receivables_insert" ON public.receivables FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "receivables_update" ON public.receivables;
CREATE POLICY "receivables_update" ON public.receivables FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "receivables_delete" ON public.receivables;
CREATE POLICY "receivables_delete" ON public.receivables FOR DELETE USING (clinic_id = public.current_clinic_id());

-- payables
DROP POLICY IF EXISTS "payables_select" ON public.payables;
CREATE POLICY "payables_select" ON public.payables FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "payables_insert" ON public.payables;
CREATE POLICY "payables_insert" ON public.payables FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "payables_update" ON public.payables;
CREATE POLICY "payables_update" ON public.payables FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "payables_delete" ON public.payables;
CREATE POLICY "payables_delete" ON public.payables FOR DELETE USING (clinic_id = public.current_clinic_id());

-- ortho_contracts
DROP POLICY IF EXISTS "ortho_contracts_select" ON public.ortho_contracts;
CREATE POLICY "ortho_contracts_select" ON public.ortho_contracts FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "ortho_contracts_insert" ON public.ortho_contracts;
CREATE POLICY "ortho_contracts_insert" ON public.ortho_contracts FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "ortho_contracts_update" ON public.ortho_contracts;
CREATE POLICY "ortho_contracts_update" ON public.ortho_contracts FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "ortho_contracts_delete" ON public.ortho_contracts;
CREATE POLICY "ortho_contracts_delete" ON public.ortho_contracts FOR DELETE USING (clinic_id = public.current_clinic_id());

-- recurring_rules
DROP POLICY IF EXISTS "recurring_rules_select" ON public.recurring_rules;
CREATE POLICY "recurring_rules_select" ON public.recurring_rules FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "recurring_rules_insert" ON public.recurring_rules;
CREATE POLICY "recurring_rules_insert" ON public.recurring_rules FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "recurring_rules_update" ON public.recurring_rules;
CREATE POLICY "recurring_rules_update" ON public.recurring_rules FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "recurring_rules_delete" ON public.recurring_rules;
CREATE POLICY "recurring_rules_delete" ON public.recurring_rules FOR DELETE USING (clinic_id = public.current_clinic_id());

-- budgets
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "budgets_update" ON public.budgets;
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id());
DROP POLICY IF EXISTS "budgets_delete" ON public.budgets;
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (clinic_id = public.current_clinic_id());

-- ===================== 6. TRIGGERS (drop + recreate = idempotent) =====================

DROP TRIGGER IF EXISTS trg_categories_set_clinic ON public.categories;
CREATE TRIGGER trg_categories_set_clinic BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_cost_centers_set_clinic ON public.cost_centers;
CREATE TRIGGER trg_cost_centers_set_clinic BEFORE INSERT ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_financial_transactions_set_clinic ON public.financial_transactions;
CREATE TRIGGER trg_financial_transactions_set_clinic BEFORE INSERT ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_financial_entries_set_clinic ON public.financial_entries;
CREATE TRIGGER trg_financial_entries_set_clinic BEFORE INSERT ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_receivables_set_clinic ON public.receivables;
CREATE TRIGGER trg_receivables_set_clinic BEFORE INSERT ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_payables_set_clinic ON public.payables;
CREATE TRIGGER trg_payables_set_clinic BEFORE INSERT ON public.payables FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_ortho_contracts_set_clinic ON public.ortho_contracts;
CREATE TRIGGER trg_ortho_contracts_set_clinic BEFORE INSERT ON public.ortho_contracts FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_recurring_rules_set_clinic ON public.recurring_rules;
CREATE TRIGGER trg_recurring_rules_set_clinic BEFORE INSERT ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

DROP TRIGGER IF EXISTS trg_budgets_set_clinic ON public.budgets;
CREATE TRIGGER trg_budgets_set_clinic BEFORE INSERT ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();
