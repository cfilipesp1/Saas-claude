-- =====================================================
-- SCRIPT COMPLETO: PROFILES + APPOINTMENTS
-- Sistema de Clínica Odontológica
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

-- =====================================================
-- PARTE 1: TABELA PROFILES (atualização compatível)
-- =====================================================

-- A tabela profiles já é criada por full_migration.sql.
-- Adicionamos colunas extras se não existirem:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Índices extras
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at em profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: profiles policies are already defined in full_migration.sql
-- using user_id = auth.uid() (safe, no recursion)

-- =====================================================
-- PARTE 2: TABELA APPOINTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  tipo_atendimento TEXT NOT NULL CHECK (tipo_atendimento IN ('ORTODONTIA', 'GERAL')),
  specialty TEXT NOT NULL,
  procedures JSONB NOT NULL DEFAULT '[]'::jsonb,
  teeth JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  next_appointment DATE,
  signature_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  wire_info JSONB,
  dentista_atendente_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  dentista_responsavel_no_momento_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  atendimento_fora_da_responsabilidade BOOLEAN DEFAULT false,
  motivo_fora TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT appointments_procedures_not_empty CHECK (jsonb_array_length(procedures) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_dentista_atendente ON appointments(dentista_atendente_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tipo ON appointments(tipo_atendimento);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set clinic_id
DROP TRIGGER IF EXISTS trg_appointments_set_clinic ON appointments;
CREATE TRIGGER trg_appointments_set_clinic
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- RLS (uses SECURITY DEFINER function to avoid recursion)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_select_policy ON appointments;
CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_insert_policy ON appointments;
CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_update_policy ON appointments;
CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_delete_policy ON appointments;
CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE USING (clinic_id = public.current_clinic_id());

SELECT 'Script executado com sucesso! Tabelas profiles e appointments atualizadas.' as status;
