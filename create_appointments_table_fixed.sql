-- =====================================================
-- TABELA APPOINTMENTS (Atendimentos/Prontuários)
-- Sistema de Clínica Odontológica
-- Versão CORRIGIDA - Sem dependência de tabela profiles
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
-- ÍNDICES PARA PERFORMANCE
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
-- FUNÇÃO PARA UPDATED_AT (se não existir)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários veem atendimentos da própria clínica
CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT - Usuários inserem atendimentos na própria clínica
CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: UPDATE - Usuários atualizam atendimentos da própria clínica
CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: DELETE - Apenas ADMIN e OWNER podem deletar
CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE appointments IS 'Atendimentos e prontuários dos pacientes';
COMMENT ON COLUMN appointments.patient_id IS 'Referência ao paciente';
COMMENT ON COLUMN appointments.clinic_id IS 'Referência à clínica (multi-tenant)';
COMMENT ON COLUMN appointments.appointment_date IS 'Data do atendimento';
COMMENT ON COLUMN appointments.tipo_atendimento IS 'Tipo: ORTODONTIA ou GERAL';
COMMENT ON COLUMN appointments.specialty IS 'Especialidade do atendimento';
COMMENT ON COLUMN appointments.procedures IS 'Array JSON de procedimentos realizados';
COMMENT ON COLUMN appointments.teeth IS 'Array JSON de dentes tratados (numeração FDI)';
COMMENT ON COLUMN appointments.notes IS 'Observações do atendimento';
COMMENT ON COLUMN appointments.next_appointment IS 'Data da próxima consulta';
COMMENT ON COLUMN appointments.signature_url IS 'URL da assinatura do paciente no Storage';
COMMENT ON COLUMN appointments.photos IS 'Array JSON com URLs das fotos clínicas';
COMMENT ON COLUMN appointments.wire_info IS 'JSON com informações do fio ortodôntico (arcadas superior/inferior)';
COMMENT ON COLUMN appointments.dentista_atendente_id IS 'ID do dentista que realizou o atendimento (TEXT por enquanto)';
COMMENT ON COLUMN appointments.dentista_responsavel_no_momento_id IS 'ID do dentista responsável no momento do atendimento (TEXT por enquanto)';
COMMENT ON COLUMN appointments.atendimento_fora_da_responsabilidade IS 'Se o atendimento foi feito por dentista diferente do responsável';
COMMENT ON COLUMN appointments.motivo_fora IS 'Motivo do atendimento fora da responsabilidade';

-- =====================================================
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Verificar se a tabela foi criada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'appointments'
) AS table_exists;

-- Verificar colunas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'appointments'
ORDER BY indexname;

-- Verificar policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Inserir atendimento ortodôntico
/*
INSERT INTO appointments (
  patient_id,
  clinic_id,
  appointment_date,
  tipo_atendimento,
  specialty,
  procedures,
  teeth,
  notes,
  wire_info,
  dentista_atendente_id,
  dentista_responsavel_no_momento_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  '2026-02-19',
  'ORTODONTIA',
  'ortodontia',
  '["Colagem de Braquetes", "Troca de Fio"]'::jsonb,
  '[11, 12, 13, 21, 22, 23]'::jsonb,
  'Paciente colaborativo, boa higiene',
  '{
    "upper": {
      "material": "Aço Inoxidável",
      "format": "Redondo",
      "gauge": "0.014\""
    },
    "lower": {
      "material": "NiTi",
      "format": "Retangular",
      "gauge": "0.016\" x 0.022\""
    }
  }'::jsonb,
  'user-123',
  'user-123'
);
*/

-- Exemplo 2: Buscar atendimentos de um paciente
/*
SELECT 
  a.*,
  p.name as patient_name
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE a.patient_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY a.appointment_date DESC;
*/

-- Exemplo 3: Buscar atendimentos ortodônticos do mês
/*
SELECT 
  a.*,
  p.name as patient_name
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE a.tipo_atendimento = 'ORTODONTIA'
  AND a.appointment_date >= date_trunc('month', CURRENT_DATE)
  AND a.appointment_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
ORDER BY a.appointment_date DESC;
*/

-- Exemplo 4: Estatísticas de atendimentos por especialidade
/*
SELECT 
  specialty,
  tipo_atendimento,
  COUNT(*) as total_atendimentos,
  COUNT(DISTINCT patient_id) as total_pacientes
FROM appointments
WHERE clinic_id = '660e8400-e29b-41d4-a716-446655440000'
  AND appointment_date >= CURRENT_DATE - interval '30 days'
GROUP BY specialty, tipo_atendimento
ORDER BY total_atendimentos DESC;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
ALTERAÇÕES NESTA VERSÃO:
1. dentista_atendente_id e dentista_responsavel_no_momento_id são TEXT (não UUID com FK)
2. Isso permite que o sistema funcione sem a tabela profiles
3. No futuro, quando criar a tabela profiles, você pode:
   - Alterar o tipo para UUID
   - Adicionar foreign keys
   
COMANDO PARA ADICIONAR FK NO FUTURO:
ALTER TABLE appointments 
  ADD CONSTRAINT fk_dentista_atendente 
  FOREIGN KEY (dentista_atendente_id) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;

ALTER TABLE appointments 
  ADD CONSTRAINT fk_dentista_responsavel 
  FOREIGN KEY (dentista_responsavel_no_momento_id) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;
*/
