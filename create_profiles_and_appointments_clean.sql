-- =====================================================
-- SCRIPT COMPLETO: PROFILES + APPOINTMENTS
-- Sistema de Clínica Odontológica
-- VERSÃO LIMPA - Usa CREATE IF NOT EXISTS (sem DROP CASCADE)
-- =====================================================

-- IMPORTANTE: Este script depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

-- =====================================================
-- PARTE 1: TABELA PROFILES (atualização compatível)
-- =====================================================

-- A tabela profiles já é criada por full_migration.sql.
-- Adicionamos colunas extras se não existirem:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Índices extras para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Função para updated_at (criar se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at em profiles (drop primeiro para ser idempotente)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para profiles (já habilitado por full_migration.sql)
-- As policies de full_migration.sql usam user_id = auth.uid() (seguro)
-- Não criamos policies duplicadas aqui

-- =====================================================
-- PARTE 2: TABELA APPOINTMENTS
-- =====================================================

-- Criar tabela appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Dados do atendimento
  appointment_date DATE NOT NULL,
  tipo_atendimento TEXT NOT NULL CHECK (tipo_atendimento IN ('ORTODONTIA', 'GERAL')),
  specialty TEXT NOT NULL,
  procedures JSONB NOT NULL DEFAULT '[]'::jsonb,
  teeth JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  next_appointment DATE,

  -- Assinatura e fotos (Storage - URLs)
  signature_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,

  -- Informações do fio ortodôntico (apenas para ORTODONTIA)
  wire_info JSONB,

  -- Responsabilidade
  dentista_atendente_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  dentista_responsavel_no_momento_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  atendimento_fora_da_responsabilidade BOOLEAN DEFAULT false,
  motivo_fora TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT appointments_procedures_not_empty CHECK (jsonb_array_length(procedures) > 0)
);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_dentista_atendente ON appointments(dentista_atendente_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tipo ON appointments(tipo_atendimento);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);

-- Trigger para updated_at em appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set clinic_id via SECURITY DEFINER trigger (same pattern as full_migration.sql)
DROP TRIGGER IF EXISTS trg_appointments_set_clinic ON appointments;
CREATE TRIGGER trg_appointments_set_clinic
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- RLS para appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Use public.current_clinic_id() (SECURITY DEFINER) to avoid
-- infinite recursion when querying profiles with RLS enabled.

DROP POLICY IF EXISTS appointments_select_policy ON appointments;
CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_insert_policy ON appointments;
CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_update_policy ON appointments;
CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS appointments_delete_policy ON appointments;
CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'appointments')
ORDER BY table_name;
