-- =====================================================
-- TABELA APPOINTMENTS (Atendimentos/Prontuarios)
-- Sistema de Clinica Odontologica
-- Versao CORRIGIDA - Sem dependencia de tabela profiles
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

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

  -- Informacoes do fio ortodontico (apenas para ORTODONTIA)
  wire_info JSONB,

  -- Responsabilidade (IDs como TEXT - sem FK por enquanto)
  dentista_atendente_id TEXT,
  dentista_responsavel_no_momento_id TEXT,
  atendimento_fora_da_responsabilidade BOOLEAN DEFAULT false,
  motivo_fora TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT appointments_procedures_not_empty CHECK (jsonb_array_length(procedures) > 0)
);

-- =====================================================
-- INDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id
  ON appointments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments(appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_dentista_atendente
  ON appointments(dentista_atendente_id);

CREATE INDEX IF NOT EXISTS idx_appointments_tipo
  ON appointments(tipo_atendimento);

CREATE INDEX IF NOT EXISTS idx_appointments_specialty
  ON appointments(specialty);

CREATE INDEX IF NOT EXISTS idx_appointments_created_at
  ON appointments(created_at DESC);

-- =====================================================
-- FUNCAO PARA UPDATED_AT (se nao existir)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para updated_at (idempotente)
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set clinic_id via SECURITY DEFINER trigger
DROP TRIGGER IF EXISTS trg_appointments_set_clinic ON appointments;
CREATE TRIGGER trg_appointments_set_clinic
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- IMPORTANT: Uses public.current_clinic_id() (SECURITY DEFINER) to avoid
-- infinite recursion when querying profiles with RLS enabled.

-- Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuarios veem atendimentos da propria clinica
DROP POLICY IF EXISTS appointments_select_policy ON appointments;
CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- Policy: INSERT - Usuarios inserem atendimentos na propria clinica
DROP POLICY IF EXISTS appointments_insert_policy ON appointments;
CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

-- Policy: UPDATE - Usuarios atualizam atendimentos da propria clinica
DROP POLICY IF EXISTS appointments_update_policy ON appointments;
CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- Policy: DELETE - Usuarios deletam atendimentos da propria clinica
DROP POLICY IF EXISTS appointments_delete_policy ON appointments;
CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACAO
-- =====================================================

COMMENT ON TABLE appointments IS 'Atendimentos e prontuarios dos pacientes';
COMMENT ON COLUMN appointments.patient_id IS 'Referencia ao paciente';
COMMENT ON COLUMN appointments.clinic_id IS 'Referencia a clinica (multi-tenant)';
COMMENT ON COLUMN appointments.appointment_date IS 'Data do atendimento';
COMMENT ON COLUMN appointments.tipo_atendimento IS 'Tipo: ORTODONTIA ou GERAL';
COMMENT ON COLUMN appointments.specialty IS 'Especialidade do atendimento';
COMMENT ON COLUMN appointments.procedures IS 'Array JSON de procedimentos realizados';
COMMENT ON COLUMN appointments.teeth IS 'Array JSON de dentes tratados (numeracao FDI)';
COMMENT ON COLUMN appointments.notes IS 'Observacoes do atendimento';
COMMENT ON COLUMN appointments.next_appointment IS 'Data da proxima consulta';
COMMENT ON COLUMN appointments.signature_url IS 'URL da assinatura do paciente no Storage';
COMMENT ON COLUMN appointments.photos IS 'Array JSON com URLs das fotos clinicas';
COMMENT ON COLUMN appointments.wire_info IS 'JSON com informacoes do fio ortodontico (arcadas superior/inferior)';
COMMENT ON COLUMN appointments.dentista_atendente_id IS 'ID do dentista que realizou o atendimento (TEXT por enquanto)';
COMMENT ON COLUMN appointments.dentista_responsavel_no_momento_id IS 'ID do dentista responsavel no momento do atendimento (TEXT por enquanto)';
COMMENT ON COLUMN appointments.atendimento_fora_da_responsabilidade IS 'Se o atendimento foi feito por dentista diferente do responsavel';
COMMENT ON COLUMN appointments.motivo_fora IS 'Motivo do atendimento fora da responsabilidade';

-- =====================================================
-- VERIFICACAO
-- =====================================================

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'appointments'
) AS table_exists;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointments'
ORDER BY ordinal_position;
