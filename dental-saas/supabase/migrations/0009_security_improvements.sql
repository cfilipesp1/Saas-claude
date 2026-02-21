-- ============================================================
-- O+ Dental SaaS — Security & Scalability Improvements
-- Migration 0009: Role-based RLS, atomic operations, indexes,
--                 updated_at triggers, cron for overdue items
-- ============================================================

-- ─── HELPER: Get current user's role ──────────────────────────
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

-- ─── HELPER: Check if current user is admin-level ─────────────
create or replace function public.is_admin_or_owner()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role in ('OWNER', 'ADMIN')
  );
$$;

-- ============================================================
-- 1. ROLE-BASED RLS POLICIES
--    Replace permissive DELETE policies with role-restricted ones
-- ============================================================

-- patients: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "patients_delete" on public.patients;
create policy "patients_delete" on public.patients
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- professionals: only OWNER/ADMIN can delete
drop policy if exists "professionals_delete" on public.professionals;
create policy "professionals_delete" on public.professionals
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.is_admin_or_owner()
  );

-- financial_transactions: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "financial_transactions_delete" on public.financial_transactions;
create policy "financial_transactions_delete" on public.financial_transactions
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- receivables: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "receivables_delete" on public.receivables;
create policy "receivables_delete" on public.receivables
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- payables: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "payables_delete" on public.payables;
create policy "payables_delete" on public.payables
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- ortho_contracts: only OWNER/ADMIN can delete
drop policy if exists "ortho_contracts_delete" on public.ortho_contracts;
create policy "ortho_contracts_delete" on public.ortho_contracts
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.is_admin_or_owner()
  );

-- categories: only OWNER/ADMIN can delete
drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete" on public.categories
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.is_admin_or_owner()
  );

-- cost_centers: only OWNER/ADMIN can delete
drop policy if exists "cost_centers_delete" on public.cost_centers;
create policy "cost_centers_delete" on public.cost_centers
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.is_admin_or_owner()
  );

-- budgets: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "budgets_delete" on public.budgets;
create policy "budgets_delete" on public.budgets
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- waitlist_entries: only OWNER/ADMIN/MANAGER can delete
drop policy if exists "waitlist_entries_delete" on public.waitlist_entries;
create policy "waitlist_entries_delete" on public.waitlist_entries
  for delete using (
    clinic_id = public.current_clinic_id()
    and public.current_user_role() in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- profiles: admin can see all clinic profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    user_id = auth.uid()
    or clinic_id = public.current_clinic_id()
  );

-- ============================================================
-- 2. ATOMIC STORED PROCEDURES
-- ============================================================

-- 2a. Create ortho contract + receivables atomically
create or replace function public.create_ortho_contract_atomic(
  p_patient_id uuid,
  p_monthly_amount numeric,
  p_total_months integer,
  p_due_day integer,
  p_start_date date,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_contract_id uuid;
  v_months integer;
  v_due integer;
  v_base_date date;
  v_due_date date;
  v_last_day integer;
begin
  v_clinic_id := public.current_clinic_id();
  if v_clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;

  v_months := coalesce(p_total_months, 24);
  v_due := coalesce(p_due_day, 10);

  -- Insert contract
  insert into public.ortho_contracts (
    clinic_id, patient_id, monthly_amount, total_months,
    due_day, start_date, notes, status
  ) values (
    v_clinic_id, p_patient_id, p_monthly_amount, v_months,
    v_due, p_start_date, p_notes, 'active'
  )
  returning id into v_contract_id;

  -- Generate receivables for all months
  for i in 0..(v_months - 1) loop
    v_base_date := p_start_date + (i * interval '1 month');
    -- Calculate last day of the target month to avoid overflow
    v_last_day := extract(day from (date_trunc('month', v_base_date) + interval '1 month' - interval '1 day'));
    v_due_date := date_trunc('month', v_base_date) + (least(v_due, v_last_day) - 1) * interval '1 day';

    insert into public.receivables (
      clinic_id, patient_id, origin_type, origin_id,
      installment_num, total_installments, due_date,
      amount, status, description
    ) values (
      v_clinic_id, p_patient_id, 'ortho_contract', v_contract_id,
      i + 1, v_months, v_due_date::date,
      p_monthly_amount, 'open',
      'Ortodontia - Mês ' || (i + 1) || '/' || v_months
    );
  end loop;

  return v_contract_id;
end;
$$;

-- 2b. Create transaction + entries atomically
create or replace function public.create_transaction_atomic(
  p_type public.financial_type,
  p_patient_id uuid,
  p_total_amount numeric,
  p_payment_method public.payment_method,
  p_transaction_date date,
  p_description text,
  p_created_by uuid,
  p_entries jsonb default '[]',
  p_receivable_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_tx_id uuid;
  v_entry jsonb;
  v_entries_sum numeric := 0;
begin
  v_clinic_id := public.current_clinic_id();
  if v_clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;

  -- Insert transaction
  insert into public.financial_transactions (
    clinic_id, type, patient_id, total_amount,
    payment_method, transaction_date, description, created_by
  ) values (
    v_clinic_id, p_type, p_patient_id, p_total_amount,
    p_payment_method, p_transaction_date, p_description, p_created_by
  )
  returning id into v_tx_id;

  -- Insert entries
  if jsonb_array_length(p_entries) > 0 then
    for v_entry in select * from jsonb_array_elements(p_entries)
    loop
      insert into public.financial_entries (
        clinic_id, transaction_id, category_id, cost_center_id, amount
      ) values (
        v_clinic_id,
        v_tx_id,
        nullif(v_entry->>'category_id', '')::uuid,
        nullif(v_entry->>'cost_center_id', '')::uuid,
        (v_entry->>'amount')::numeric
      );
      v_entries_sum := v_entries_sum + (v_entry->>'amount')::numeric;
    end loop;

    -- Validate entries sum
    if abs(v_entries_sum - p_total_amount) > 0.01 then
      raise exception 'Entries sum (%) does not match total amount (%)', v_entries_sum, p_total_amount;
    end if;
  else
    -- Single default entry
    insert into public.financial_entries (
      clinic_id, transaction_id, category_id, cost_center_id, amount
    ) values (
      v_clinic_id, v_tx_id, null, null, p_total_amount
    );
  end if;

  -- Auto-settle receivable if linked
  if p_receivable_id is not null and p_type = 'IN' then
    update public.receivables
    set status = 'paid',
        paid_amount = p_total_amount,
        paid_at = now()
    where id = p_receivable_id
      and clinic_id = v_clinic_id;
  end if;

  return v_tx_id;
end;
$$;

-- 2c. Settle receivable + create transaction atomically
create or replace function public.settle_receivable_atomic(
  p_receivable_id uuid,
  p_paid_amount numeric,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_rec record;
  v_status public.receivable_status;
begin
  v_clinic_id := public.current_clinic_id();
  if v_clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;

  select amount, patient_id into v_rec
  from public.receivables
  where id = p_receivable_id and clinic_id = v_clinic_id;

  if not found then
    raise exception 'Receivable not found';
  end if;

  if p_paid_amount >= v_rec.amount then
    v_status := 'paid';
  else
    v_status := 'open';
  end if;

  update public.receivables
  set status = v_status,
      paid_amount = p_paid_amount,
      paid_at = case when v_status = 'paid' then now() else null end
  where id = p_receivable_id and clinic_id = v_clinic_id;

  if p_paid_amount > 0 then
    insert into public.financial_transactions (
      clinic_id, type, patient_id, total_amount,
      payment_method, transaction_date, description, created_by
    ) values (
      v_clinic_id, 'IN', v_rec.patient_id, p_paid_amount,
      'cash', current_date, 'Baixa de conta a receber', p_user_id
    );
  end if;
end;
$$;

-- 2d. Settle payable + create transaction atomically
create or replace function public.settle_payable_atomic(
  p_payable_id uuid,
  p_paid_amount numeric,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_pay record;
  v_status public.payable_status;
  v_tx_id uuid;
begin
  v_clinic_id := public.current_clinic_id();
  if v_clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;

  select amount, supplier, category_id, cost_center_id into v_pay
  from public.payables
  where id = p_payable_id and clinic_id = v_clinic_id;

  if not found then
    raise exception 'Payable not found';
  end if;

  if p_paid_amount >= v_pay.amount then
    v_status := 'paid';
  else
    v_status := 'open';
  end if;

  update public.payables
  set status = v_status,
      paid_amount = p_paid_amount,
      paid_at = case when v_status = 'paid' then now() else null end
  where id = p_payable_id and clinic_id = v_clinic_id;

  if p_paid_amount > 0 then
    insert into public.financial_transactions (
      clinic_id, type, total_amount, payment_method,
      transaction_date, description, created_by
    ) values (
      v_clinic_id, 'OUT', p_paid_amount, 'cash',
      current_date, 'Pagamento: ' || v_pay.supplier, p_user_id
    )
    returning id into v_tx_id;

    if v_pay.category_id is not null or v_pay.cost_center_id is not null then
      insert into public.financial_entries (
        clinic_id, transaction_id, category_id, cost_center_id, amount
      ) values (
        v_clinic_id, v_tx_id, v_pay.category_id, v_pay.cost_center_id, p_paid_amount
      );
    end if;
  end if;
end;
$$;

-- ============================================================
-- 3. COMPOSITE INDEXES for query performance
-- ============================================================

create index if not exists idx_patients_clinic_name on public.patients(clinic_id, name);
create index if not exists idx_patients_clinic_email on public.patients(clinic_id, email);
create index if not exists idx_receivables_origin on public.receivables(origin_type, origin_id);
create index if not exists idx_financial_transactions_clinic_date on public.financial_transactions(clinic_id, transaction_date);
create index if not exists idx_budgets_clinic_status on public.budgets(clinic_id, status);
create index if not exists idx_receivables_clinic_status on public.receivables(clinic_id, status);
create index if not exists idx_payables_clinic_status on public.payables(clinic_id, status);
create index if not exists idx_waitlist_entries_clinic_status on public.waitlist_entries(clinic_id, status);

-- ============================================================
-- 4. UPDATED_AT COLUMN + AUTO-UPDATE TRIGGER
-- ============================================================

-- Generic trigger function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Add updated_at to all main tables
alter table public.clinics add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.professionals add column if not exists updated_at timestamptz not null default now();
alter table public.patients add column if not exists updated_at timestamptz not null default now();
alter table public.waitlist_entries add column if not exists updated_at timestamptz not null default now();
alter table public.financial_transactions add column if not exists updated_at timestamptz not null default now();
alter table public.receivables add column if not exists updated_at timestamptz not null default now();
alter table public.payables add column if not exists updated_at timestamptz not null default now();
alter table public.ortho_contracts add column if not exists updated_at timestamptz not null default now();
alter table public.budgets add column if not exists updated_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.cost_centers add column if not exists updated_at timestamptz not null default now();

-- Drop triggers first (idempotent) then recreate
drop trigger if exists trg_clinics_updated_at on public.clinics;
create trigger trg_clinics_updated_at before update on public.clinics
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_professionals_updated_at on public.professionals;
create trigger trg_professionals_updated_at before update on public.professionals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_waitlist_entries_updated_at on public.waitlist_entries;
create trigger trg_waitlist_entries_updated_at before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_financial_transactions_updated_at on public.financial_transactions;
create trigger trg_financial_transactions_updated_at before update on public.financial_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_receivables_updated_at on public.receivables;
create trigger trg_receivables_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payables_updated_at on public.payables;
create trigger trg_payables_updated_at before update on public.payables
  for each row execute function public.set_updated_at();

drop trigger if exists trg_ortho_contracts_updated_at on public.ortho_contracts;
create trigger trg_ortho_contracts_updated_at before update on public.ortho_contracts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cost_centers_updated_at on public.cost_centers;
create trigger trg_cost_centers_updated_at before update on public.cost_centers
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. MARK OVERDUE RECEIVABLES/PAYABLES (callable function)
-- ============================================================

create or replace function public.mark_overdue_items()
returns void
language plpgsql
security definer
as $$
begin
  update public.receivables
  set status = 'overdue'
  where status = 'open'
    and due_date < current_date;

  update public.payables
  set status = 'overdue'
  where status = 'open'
    and due_date < current_date;
end;
$$;

-- ============================================================
-- 6. MARCAR ITENS VENCIDOS
--    A funcao mark_overdue_items() acima pode ser chamada:
--    a) Pelo app no login/carregamento do dashboard
--    b) Por uma Supabase Edge Function agendada
--    c) Por pg_cron (requer plano Pro do Supabase)
-- ============================================================
