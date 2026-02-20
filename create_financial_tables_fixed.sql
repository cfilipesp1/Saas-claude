-- =====================================================
-- TABELAS FINANCEIRAS (VERSÃO CORRIGIDA)
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

-- Trigger para updated_at (função já existe da Fase 3)
CREATE TRIGGER update_patient_budgets_updated_at
  BEFORE UPDATE ON patient_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para patient_budgets
ALTER TABLE patient_budgets ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários veem orçamentos da própria clínica
CREATE POLICY patient_budgets_select_policy ON patient_budgets
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT - Usuários inserem orçamentos na própria clínica
CREATE POLICY patient_budgets_insert_policy ON patient_budgets
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: UPDATE - Usuários atualizam orçamentos da própria clínica
CREATE POLICY patient_budgets_update_policy ON patient_budgets
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: DELETE - Apenas ADMIN e OWNER podem deletar
CREATE POLICY patient_budgets_delete_policy ON patient_budgets
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Comentários
COMMENT ON TABLE patient_budgets IS 'Orçamentos totais dos pacientes';
COMMENT ON COLUMN patient_budgets.patient_id IS 'Referência ao paciente';
COMMENT ON COLUMN patient_budgets.clinic_id IS 'ID da clínica (multi-tenant)';
COMMENT ON COLUMN patient_budgets.total_amount IS 'Valor total do orçamento';
COMMENT ON COLUMN patient_budgets.created_by IS 'Usuário que criou o orçamento';
COMMENT ON COLUMN patient_budgets.updated_by IS 'Usuário que atualizou o orçamento';

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

-- Policy: SELECT - Usuários veem pagamentos da própria clínica
CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT - Apenas ADMIN e ATENDENTE podem inserir pagamentos
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER', 'ATENDENTE')
    )
  );

-- Policy: DELETE - Apenas ADMIN e OWNER podem deletar
CREATE POLICY payments_delete_policy ON payments
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Comentários
COMMENT ON TABLE payments IS 'Pagamentos realizados pelos pacientes';
COMMENT ON COLUMN payments.patient_id IS 'Referência ao paciente';
COMMENT ON COLUMN payments.clinic_id IS 'ID da clínica (multi-tenant)';
COMMENT ON COLUMN payments.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN payments.amount IS 'Valor do pagamento';
COMMENT ON COLUMN payments.payment_method IS 'Forma de pagamento (avista ou parcelado)';
COMMENT ON COLUMN payments.notes IS 'Observações sobre o pagamento';
COMMENT ON COLUMN payments.registered_by IS 'Usuário que registrou o pagamento';
COMMENT ON COLUMN payments.registered_at IS 'Data/hora do registro';

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View: Resumo financeiro por paciente
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
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('patient_budgets', 'payments')
ORDER BY table_name;

-- Verificar colunas de patient_budgets
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patient_budgets'
ORDER BY ordinal_position;

-- Verificar colunas de payments
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'payments'
ORDER BY ordinal_position;

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

-- Verificar view
SELECT EXISTS (
  SELECT FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'patient_financial_summary'
) AS view_exists;

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Criar/atualizar orçamento (UPSERT)
/*
INSERT INTO patient_budgets (patient_id, clinic_id, total_amount, created_by, updated_by)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  5000.00,
  '770e8400-e29b-41d4-a716-446655440000',
  '770e8400-e29b-41d4-a716-446655440000'
)
ON CONFLICT (patient_id) 
DO UPDATE SET 
  total_amount = EXCLUDED.total_amount,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();
*/

-- Exemplo 2: Adicionar pagamento
/*
INSERT INTO payments (patient_id, clinic_id, payment_date, amount, payment_method, notes, registered_by)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  '2024-01-15',
  500.00,
  'avista',
  'Pagamento à vista',
  '770e8400-e29b-41d4-a716-446655440000'
);
*/

-- Exemplo 3: Buscar orçamento de um paciente
/*
SELECT * FROM patient_budgets 
WHERE patient_id = '550e8400-e29b-41d4-a716-446655440000';
*/

-- Exemplo 4: Buscar pagamentos de um paciente com nome do usuário
/*
SELECT 
  pay.*,
  prof.full_name as registered_by_name
FROM payments pay
LEFT JOIN profiles prof ON prof.user_id = pay.registered_by
WHERE pay.patient_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY pay.payment_date DESC;
*/

-- Exemplo 5: Resumo financeiro de um paciente
/*
SELECT * FROM patient_financial_summary
WHERE patient_id = '550e8400-e29b-41d4-a716-446655440000';
*/

-- Exemplo 6: Relatório de pacientes com saldo devedor
/*
SELECT 
  patient_name,
  budget_total,
  total_paid,
  balance,
  payment_count,
  status
FROM patient_financial_summary
WHERE clinic_id = '660e8400-e29b-41d4-a716-446655440000'
  AND status IN ('aberto', 'parcial')
ORDER BY balance DESC;
*/

-- Exemplo 7: Total de pagamentos por forma de pagamento
/*
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total
FROM payments
WHERE clinic_id = '660e8400-e29b-41d4-a716-446655440000'
  AND payment_date >= '2024-01-01'
  AND payment_date <= '2024-12-31'
GROUP BY payment_method;
*/

-- Exemplo 8: Deletar pagamento
/*
DELETE FROM payments 
WHERE id = 'payment-id';
*/

-- =====================================================
-- SUCESSO!
-- =====================================================

SELECT '✅ Tabelas financeiras criadas com sucesso!' as status;
