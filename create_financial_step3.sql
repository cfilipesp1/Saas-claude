-- =====================================================
-- ETAPA 3: Índices adicionais, Trigger e RLS Policies
-- =====================================================

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id ON patient_budgets(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_budgets_updated_at ON patient_budgets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_registered_at ON payments(registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_registered_by ON payments(registered_by);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- Trigger para updated_at
CREATE TRIGGER update_patient_budgets_updated_at
  BEFORE UPDATE ON patient_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para patient_budgets
ALTER TABLE patient_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_budgets_select_policy ON patient_budgets
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY patient_budgets_insert_policy ON patient_budgets
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY patient_budgets_update_policy ON patient_budgets
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY patient_budgets_delete_policy ON patient_budgets
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- RLS para payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER', 'ATENDENTE')
    )
  );

CREATE POLICY payments_delete_policy ON payments
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

SELECT '✅ Etapa 3 concluída - Índices, Trigger e RLS configurados' as status;
