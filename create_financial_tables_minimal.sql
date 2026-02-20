-- =====================================================
-- TABELAS FINANCEIRAS (VERSAO MINIMA)
-- Sistema de Clinica Odontologica - Fase 5
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

-- TABELA 1: PATIENT_BUDGETS
CREATE TABLE IF NOT EXISTS patient_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE UNIQUE,
  clinic_id UUID NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA 2: PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('avista', 'parcelado')),
  notes TEXT,
  registered_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id ON patient_budgets(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_budgets_clinic_id ON patient_budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

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

DROP TRIGGER IF EXISTS trg_payments_set_clinic ON payments;
CREATE TRIGGER trg_payments_set_clinic
  BEFORE INSERT ON payments
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

-- Verificacao
SELECT 'Tabelas criadas com RLS!' as status;
