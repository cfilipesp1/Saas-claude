-- =====================================================
-- ETAPA 3: Indices adicionais, Trigger e RLS Policies
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER)

-- Indices adicionais
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id ON patient_budgets(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_budgets_updated_at ON patient_budgets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_registered_at ON payments(registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_registered_by ON payments(registered_by);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

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

DROP POLICY IF EXISTS payments_delete_policy ON payments;
CREATE POLICY payments_delete_policy ON payments
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

SELECT 'Etapa 3 concluida - Indices, Trigger e RLS configurados' as status;
