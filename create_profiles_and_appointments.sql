-- =====================================================
-- SCRIPT COMPLETO: PROFILES + APPOINTMENTS
-- Sistema de Clínica Odontológica
-- =====================================================

-- =====================================================
-- PARTE 1: TABELA PROFILES
-- =====================================================

-- Criar tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'DENTISTA', 'ORTODONTISTA', 'ATENDENTE')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Trigger para updated_at em profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem perfis da própria clínica
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Apenas ADMIN e OWNER podem inserir perfis
CREATE POLICY profiles_insert_policy ON profiles
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Policy: Usuários podem atualizar próprio perfil, ADMIN/OWNER podem atualizar todos da clínica
CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Policy: Apenas OWNER pode deletar perfis
CREATE POLICY profiles_delete_policy ON profiles
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'OWNER'
    )
  );

-- Comentários
COMMENT ON TABLE profiles IS 'Perfis de usuários do sistema';
COMMENT ON COLUMN profiles.user_id IS 'Referência ao usuário do Supabase Auth';
COMMENT ON COLUMN profiles.clinic_id IS 'Clínica à qual o usuário pertence';
COMMENT ON COLUMN profiles.full_name IS 'Nome completo do usuário';
COMMENT ON COLUMN profiles.role IS 'Papel do usuário: OWNER, ADMIN, DENTISTA, ORTODONTISTA, ATENDENTE';
COMMENT ON COLUMN profiles.active IS 'Se o usuário está ativo no sistema';

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
  
  -- Responsabilidade (com FK para profiles)
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
CREATE INDEX IF NOT EXISTS idx_appointments_specialty ON appointments(specialty);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);

-- Trigger para updated_at em appointments
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para appointments
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

-- Comentários para appointments
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
COMMENT ON COLUMN appointments.dentista_atendente_id IS 'Dentista que realizou o atendimento';
COMMENT ON COLUMN appointments.dentista_responsavel_no_momento_id IS 'Dentista responsável no momento do atendimento';
COMMENT ON COLUMN appointments.atendimento_fora_da_responsabilidade IS 'Se o atendimento foi feito por dentista diferente do responsável';
COMMENT ON COLUMN appointments.motivo_fora IS 'Motivo do atendimento fora da responsabilidade';

-- =====================================================
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'appointments')
ORDER BY table_name;

-- Verificar colunas de profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Verificar colunas de appointments
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('profiles', 'appointments')
ORDER BY tablename, indexname;

-- Verificar policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'appointments')
ORDER BY tablename, policyname;

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Inserir perfil de usuário
/*
INSERT INTO profiles (user_id, clinic_id, full_name, role, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  'Dr. João Silva',
  'DENTISTA',
  true
);
*/

-- Exemplo 2: Inserir atendimento
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
  dentista_atendente_id
) VALUES (
  '770e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  '2026-02-19',
  'ORTODONTIA',
  'ortodontia',
  '["Colagem de Braquetes", "Troca de Fio"]'::jsonb,
  '[11, 12, 13]'::jsonb,
  'Paciente colaborativo',
  '550e8400-e29b-41d4-a716-446655440000'
);
*/

-- Exemplo 3: Buscar atendimentos com nome do dentista
/*
SELECT 
  a.*,
  p.name as patient_name,
  prof.full_name as dentista_name
FROM appointments a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN profiles prof ON prof.user_id = a.dentista_atendente_id
WHERE a.clinic_id = '660e8400-e29b-41d4-a716-446655440000'
ORDER BY a.appointment_date DESC
LIMIT 10;
*/

-- =====================================================
-- SUCESSO!
-- =====================================================

SELECT 'Script executado com sucesso! Tabelas profiles e appointments criadas.' as status;
