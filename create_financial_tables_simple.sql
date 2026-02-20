-- =====================================================
-- TABELAS FINANCEIRAS (VERSAO SIMPLIFICADA)
-- Sistema de Clinica Odontologica - Fase 5
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

-- =====================================================
-- TABELA 1: PATIENT_BUDGETS (Orcamentos)
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,

  -- Orcamento
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  -- Auditoria
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: Um orcamento por paciente
  UNIQUE(patient_id)
);

-- Indices para patient_budgets
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id
  ON patient_budgets(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_budgets_clinic_id
  ON patient_budgets(clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_budgets_updated_at
  ON patient_budgets(updated_at DESC);

-- Trigger para updated_at (idempotente)
DROP TRIGGER IF EXISTS update_patient_budgets_updated_at ON patient_budgets;
CREATE TRIGGER update_patient_budgets_updated_at
  BEFORE UPDATE ON patient_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set clinic_id via SECURITY DEFINER trigger
DROP TRIGGER IF EXISTS trg_patient_budgets_set_clinic ON patient_budgets;
CREATE TRIGGER trg_patient_budgets_set_clinic
  BEFORE INSERT ON patient_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- RLS para patient_budgets
-- IMPORTANT: Uses public.current_clinic_id() (SECURITY DEFINER) to avoid
-- infinite recursion when querying profiles with RLS enabled.
ALTER TABLE patient_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_budgets_select_policy ON patient_budgets;
CREATE POLICY patient_budgets_select_policy ON patient_budgets
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS patient_budgets_insert_policy ON patient_budgets;
CREATE POLICY patient_budgets_insert_policy ON patient_budgets
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS patient_budgets_update_policy ON patient_budgets;
CREATE POLICY patient_budgets_update_policy ON patient_budgets
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS patient_budgets_delete_policy ON patient_budgets;
CREATE POLICY patient_budgets_delete_policy ON patient_budgets
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- =====================================================
-- TABELA 2: PAYMENTS (Pagamentos)
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,

  -- Dados do pagamento
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('avista', 'parcelado')),
  notes TEXT,

  -- Auditoria
  registered_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para payments
CREATE INDEX IF NOT EXISTS idx_payments_patient_id
  ON payments(patient_id);

CREATE INDEX IF NOT EXISTS idx_payments_clinic_id
  ON payments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_registered_at
  ON payments(registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_registered_by
  ON payments(registered_by);

CREATE INDEX IF NOT EXISTS idx_payments_payment_method
  ON payments(payment_method);

-- Auto-set clinic_id via SECURITY DEFINER trigger
DROP TRIGGER IF EXISTS trg_payments_set_clinic ON payments;
CREATE TRIGGER trg_payments_set_clinic
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- RLS para payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_policy ON payments;
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS payments_insert_policy ON payments;
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS payments_update_policy ON payments;
CREATE POLICY payments_update_policy ON payments
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS payments_delete_policy ON payments;
CREATE POLICY payments_delete_policy ON payments
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- =====================================================
-- VERIFICACAO
-- =====================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('patient_budgets', 'payments')
ORDER BY table_name;
