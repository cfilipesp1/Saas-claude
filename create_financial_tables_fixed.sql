-- =====================================================
-- TABELAS FINANCEIRAS (VERSAO CORRIGIDA)
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

-- Comentarios
COMMENT ON TABLE patient_budgets IS 'Orcamentos totais dos pacientes';
COMMENT ON COLUMN patient_budgets.patient_id IS 'Referencia ao paciente';
COMMENT ON COLUMN patient_budgets.clinic_id IS 'ID da clinica (multi-tenant)';
COMMENT ON COLUMN patient_budgets.total_amount IS 'Valor total do orcamento';
COMMENT ON COLUMN patient_budgets.created_by IS 'Usuario que criou o orcamento';
COMMENT ON COLUMN patient_budgets.updated_by IS 'Usuario que atualizou o orcamento';

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

-- Comentarios
COMMENT ON TABLE payments IS 'Pagamentos realizados pelos pacientes';
COMMENT ON COLUMN payments.patient_id IS 'Referencia ao paciente';
COMMENT ON COLUMN payments.clinic_id IS 'ID da clinica (multi-tenant)';
COMMENT ON COLUMN payments.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN payments.amount IS 'Valor do pagamento';
COMMENT ON COLUMN payments.payment_method IS 'Forma de pagamento (avista ou parcelado)';
COMMENT ON COLUMN payments.notes IS 'Observacoes sobre o pagamento';
COMMENT ON COLUMN payments.registered_by IS 'Usuario que registrou o pagamento';
COMMENT ON COLUMN payments.registered_at IS 'Data/hora do registro';

-- =====================================================
-- VIEWS UTEIS
-- =====================================================

CREATE OR REPLACE VIEW patient_financial_summary AS
SELECT
  p.id as patient_id,
  p.name as patient_name,
  p.clinic_id,
  COALESCE(pb.total_amount, 0) as budget_total,
  COALESCE(SUM(pay.amount), 0) as total_paid,
  COALESCE(pb.total_amount, 0) - COALESCE(SUM(pay.amount), 0) as balance,
  COUNT(pay.id) as payment_count,
  CASE
    WHEN pb.total_amount IS NULL OR pb.total_amount = 0 THEN 'sem_orcamento'
    WHEN COALESCE(pb.total_amount, 0) - COALESCE(SUM(pay.amount), 0) = 0 THEN 'pago'
    WHEN COALESCE(SUM(pay.amount), 0) > 0 THEN 'parcial'
    ELSE 'aberto'
  END as status
FROM patients p
LEFT JOIN patient_budgets pb ON pb.patient_id = p.id
LEFT JOIN payments pay ON pay.patient_id = p.id
GROUP BY p.id, p.name, p.clinic_id, pb.total_amount;

COMMENT ON VIEW patient_financial_summary IS 'Resumo financeiro consolidado por paciente';

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
