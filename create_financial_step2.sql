-- =====================================================
-- ETAPA 2: Adicionar clinic_id às tabelas
-- =====================================================

-- Adicionar clinic_id em patient_budgets
ALTER TABLE patient_budgets 
ADD COLUMN IF NOT EXISTS clinic_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Adicionar clinic_id em payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS clinic_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_patient_budgets_clinic_id ON patient_budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON payments(clinic_id);

SELECT '✅ Etapa 2 concluída - clinic_id adicionado' as status;
