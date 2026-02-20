-- =====================================================
-- TABELA PATIENT_DOCUMENTS
-- Sistema de Clinica Odontologica - Fase 4
-- =====================================================
-- IMPORTANTE: Depende de full_migration.sql ter sido executado primeiro
-- (que define current_clinic_id() com SECURITY DEFINER e as tabelas base)

-- Criar tabela patient_documents
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Metadata do arquivo
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,

  -- Auditoria
  uploaded_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id
  ON patient_documents(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_documents_clinic_id
  ON patient_documents(clinic_id);

CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at
  ON patient_documents(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_by
  ON patient_documents(uploaded_by);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-set clinic_id via SECURITY DEFINER trigger
DROP TRIGGER IF EXISTS trg_patient_documents_set_clinic ON patient_documents;
CREATE TRIGGER trg_patient_documents_set_clinic
  BEFORE INSERT ON patient_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_id();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- IMPORTANT: Uses public.current_clinic_id() (SECURITY DEFINER) to avoid
-- infinite recursion when querying profiles with RLS enabled.

-- Habilitar RLS
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuarios veem documentos da propria clinica
DROP POLICY IF EXISTS patient_documents_select_policy ON patient_documents;
CREATE POLICY patient_documents_select_policy ON patient_documents
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- Policy: INSERT - Usuarios inserem documentos na propria clinica
DROP POLICY IF EXISTS patient_documents_insert_policy ON patient_documents;
CREATE POLICY patient_documents_insert_policy ON patient_documents
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

-- Policy: DELETE - Usuarios deletam documentos da propria clinica
DROP POLICY IF EXISTS patient_documents_delete_policy ON patient_documents;
CREATE POLICY patient_documents_delete_policy ON patient_documents
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE patient_documents IS 'Documentos anexados aos pacientes (Storage)';
COMMENT ON COLUMN patient_documents.patient_id IS 'Referencia ao paciente';
COMMENT ON COLUMN patient_documents.clinic_id IS 'Referencia a clinica (multi-tenant)';
COMMENT ON COLUMN patient_documents.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN patient_documents.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN patient_documents.file_size IS 'Tamanho em bytes';
COMMENT ON COLUMN patient_documents.storage_path IS 'Path no Supabase Storage';
COMMENT ON COLUMN patient_documents.storage_url IS 'URL completa do arquivo';
COMMENT ON COLUMN patient_documents.uploaded_by IS 'Usuario que fez o upload';
COMMENT ON COLUMN patient_documents.uploaded_at IS 'Data/hora do upload';

-- =====================================================
-- VERIFICACAO
-- =====================================================

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'patient_documents'
) AS table_exists;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patient_documents'
ORDER BY ordinal_position;
