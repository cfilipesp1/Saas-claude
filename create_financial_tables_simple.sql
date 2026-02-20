-- =====================================================
-- TABELAS FINANCEIRAS (VERSÃO SIMPLIFICADA)
-- Sistema de Clínica Odontológica - Fase 5
-- =====================================================

-- =====================================================
-- TABELA 1: PATIENT_BUDGETS (Orçamentos)
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,
  
  -- Orçamento
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  
  -- Auditoria
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: Um orçamento por paciente
  UNIQUE(patient_id)
);

-- Índices para patient_budgets
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id 
  ON patient_budgets(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_budgets_clinic_id 
  ON patient_budgets(clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_budgets_updated_at 
  ON patient_budgets(updated_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_patient_budgets_updated_at
  BEFORE UPDATE ON patient_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para patient_budgets
ALTER TABLE patient_budgets ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT
CREATE POLICY patient_budgets_select_policy ON patient_budgets
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT
CREATE POLICY patient_budgets_insert_policy ON patient_budgets
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: UPDATE
CREATE POLICY patient_budgets_update_policy ON patient_budgets
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: DELETE
CREATE POLICY patient_budgets_delete_policy ON patient_budgets
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

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

-- Índices para payments
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

-- RLS para payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER', 'ATENDENTE')
    )
  );

-- Policy: DELETE
CREATE POLICY payments_delete_policy ON payments
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- =====================================================
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Verificar tabelas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('patient_budgets', 'payments')
ORDER BY table_name;

-- Verificar índices
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('patient_budgets', 'payments')
ORDER BY tablename, indexname;

-- Verificar policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('patient_budgets', 'payments')
ORDER BY tablename, policyname;

-- =====================================================
-- SUCESSO!
-- =====================================================

SELECT '✅ Tabelas financeiras criadas com sucesso!' as status;
