-- =====================================================
-- TABELAS FINANCEIRAS (VERSÃO MÍNIMA - SEM RLS)
-- Sistema de Clínica Odontológica - Fase 5
-- =====================================================

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

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_budgets_patient_id ON patient_budgets(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_budgets_clinic_id ON patient_budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

-- Trigger para updated_at
CREATE TRIGGER update_patient_budgets_updated_at
  BEFORE UPDATE ON patient_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificação
SELECT '✅ Tabelas criadas!' as status;
