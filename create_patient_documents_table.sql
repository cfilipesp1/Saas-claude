-- =====================================================
-- TABELA PATIENT_DOCUMENTS
-- Sistema de Clínica Odontológica - Fase 4
-- =====================================================

-- Criar tabela patient_documents
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Metadata do arquivo
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,  -- Path no Storage (ex: clinic-1/patient-1/doc-1.pdf)
  storage_url TEXT,             -- URL completa (gerada após upload)
  
  -- Auditoria
  uploaded_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
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
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários veem documentos da própria clínica
CREATE POLICY patient_documents_select_policy ON patient_documents
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT - Usuários inserem documentos na própria clínica
CREATE POLICY patient_documents_insert_policy ON patient_documents
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: DELETE - Apenas ADMIN e OWNER podem deletar
CREATE POLICY patient_documents_delete_policy ON patient_documents
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE patient_documents IS 'Documentos anexados aos pacientes (Storage)';
COMMENT ON COLUMN patient_documents.patient_id IS 'Referência ao paciente';
COMMENT ON COLUMN patient_documents.clinic_id IS 'Referência à clínica (multi-tenant)';
COMMENT ON COLUMN patient_documents.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN patient_documents.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN patient_documents.file_size IS 'Tamanho em bytes';
COMMENT ON COLUMN patient_documents.storage_path IS 'Path no Supabase Storage';
COMMENT ON COLUMN patient_documents.storage_url IS 'URL completa do arquivo';
COMMENT ON COLUMN patient_documents.uploaded_by IS 'Usuário que fez o upload';
COMMENT ON COLUMN patient_documents.uploaded_at IS 'Data/hora do upload';

-- =====================================================
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Verificar se a tabela foi criada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'patient_documents'
) AS table_exists;

-- Verificar colunas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patient_documents'
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'patient_documents'
  AND schemaname = 'public'
ORDER BY indexname;

-- Verificar policies
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'patient_documents'
ORDER BY policyname;

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Inserir documento
/*
INSERT INTO patient_documents (
  patient_id,
  clinic_id,
  file_name,
  file_type,
  file_size,
  storage_path,
  storage_url,
  uploaded_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  'raio-x-panoramico.pdf',
  'application/pdf',
  1234567,
  '660e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440000/doc-123.pdf',
  'https://...supabase.co/storage/v1/object/public/patient-documents/660e8400.../doc-123.pdf',
  '770e8400-e29b-41d4-a716-446655440000'
);
*/

-- Exemplo 2: Buscar documentos de um paciente
/*
SELECT 
  pd.*,
  p.name as patient_name,
  prof.full_name as uploaded_by_name
FROM patient_documents pd
JOIN patients p ON p.id = pd.patient_id
LEFT JOIN profiles prof ON prof.user_id = pd.uploaded_by
WHERE pd.patient_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY pd.uploaded_at DESC;
*/

-- Exemplo 3: Buscar documentos por tipo
/*
SELECT 
  file_type,
  COUNT(*) as total,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb
FROM patient_documents
WHERE clinic_id = '660e8400-e29b-41d4-a716-446655440000'
GROUP BY file_type
ORDER BY total DESC;
*/

-- Exemplo 4: Deletar documento (também deletar do Storage!)
/*
-- Primeiro, obter o storage_path
SELECT storage_path FROM patient_documents WHERE id = 'doc-id';

-- Deletar do banco
DELETE FROM patient_documents WHERE id = 'doc-id';

-- Deletar do Storage (via código JavaScript):
-- await supabase.storage.from('patient-documents').remove([storage_path]);
*/

-- =====================================================
-- SUCESSO!
-- =====================================================

SELECT '✅ Tabela patient_documents criada com sucesso!' as status;
