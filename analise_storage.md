# Análise: Estrutura Atual de Arquivos e Documentos

## 📁 Tipos de Arquivos no Sistema

### 1. **Assinaturas de Atendimentos**
- **Formato**: Base64 (PNG)
- **Armazenamento atual**: LocalStorage
- **Chave**: `appointment_signature_{appointment_id}`
- **Geração**: Canvas HTML5 → `toDataURL("image/png")`
- **Tamanho**: ~10-50KB por assinatura

### 2. **Fotos Clínicas (Atendimentos)**
- **Formato**: JPEG, PNG, WebP, GIF
- **Armazenamento atual**: IndexedDB
- **Metadata em**: `nrForm.photos` array
- **Estrutura**: `{id, name, type, size}`
- **Limite**: 50MB por arquivo

### 3. **Documentos do Paciente**
- **Formato**: Imagens + PDF + DOCX
- **Armazenamento atual**: IndexedDB
- **Metadata em**: `patient.documents` array
- **Estrutura**: `{id, name, type, size, uploadedBy, uploadedByName, uploadedAt}`
- **Tipos permitidos**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)

---

## 🔄 Fluxo Atual

### **Upload de Foto (Atendimento)**
```javascript
1. Usuário seleciona arquivo via <input type="file">
2. FileReader lê como DataURL (base64)
3. Salva no IndexedDB com ID único
4. Metadata salva em nrForm.photos
5. Ao salvar atendimento:
   - Metadata vai para LocalStorage (appointment_photos_{id})
   - Blob fica no IndexedDB
```

### **Upload de Documento (Paciente)**
```javascript
1. Usuário seleciona arquivo via <input type="file">
2. FileReader lê como DataURL (base64)
3. Salva no IndexedDB com ID único
4. Metadata salva em patient.documents
5. Persiste no LocalStorage (patient_documents_{id})
```

### **Assinatura**
```javascript
1. Usuário desenha no canvas
2. Canvas.toDataURL("image/png") gera base64
3. Salva diretamente no LocalStorage (appointment_signature_{id})
```

---

## 🎯 Migração para Supabase Storage

### **Buckets Necessários**

#### 1. **`appointment-signatures`**
- Assinaturas de atendimentos
- Privado (RLS)
- Path: `{clinic_id}/{patient_id}/{appointment_id}.png`

#### 2. **`appointment-photos`**
- Fotos clínicas de atendimentos
- Privado (RLS)
- Path: `{clinic_id}/{patient_id}/{appointment_id}/{photo_id}.{ext}`

#### 3. **`patient-documents`**
- Documentos anexados ao paciente
- Privado (RLS)
- Path: `{clinic_id}/{patient_id}/{document_id}.{ext}`

---

## 📊 Tabela `patient_documents`

### **Schema Proposto**

```sql
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Metadata do arquivo
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,  -- Path no Storage
  storage_url TEXT,             -- URL pública/privada
  
  -- Auditoria
  uploaded_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_clinic_id ON patient_documents(clinic_id);
CREATE INDEX idx_patient_documents_uploaded_at ON patient_documents(uploaded_at DESC);

-- RLS
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_documents_select_policy ON patient_documents
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY patient_documents_insert_policy ON patient_documents
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY patient_documents_delete_policy ON patient_documents
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'OWNER')
    )
  );
```

---

## 🔄 Estratégia de Migração

### **Fase 4.1: Configurar Storage**
1. Criar buckets no Supabase
2. Configurar RLS policies para buckets
3. Testar upload/download

### **Fase 4.2: Criar Tabela**
1. Executar SQL para criar `patient_documents`
2. Verificar RLS policies

### **Fase 4.3: Implementar Upload**
1. Função `uploadToStorage(bucket, path, file)`
2. Função `uploadSignature(appointmentId, base64)`
3. Função `uploadPhoto(appointmentId, file)`
4. Função `uploadDocument(patientId, file)`

### **Fase 4.4: Migrar Dados Existentes**
1. Migrar assinaturas do LocalStorage → Storage
2. Migrar fotos do IndexedDB → Storage
3. Migrar documentos do IndexedDB → Storage
4. Atualizar appointments.signature_url
5. Atualizar appointments.photos (JSONB com URLs)
6. Criar registros em patient_documents

### **Fase 4.5: Atualizar Código**
1. Modificar `saveRecord` para fazer upload ao criar atendimento
2. Modificar `loadAppointmentsSupabase` para carregar URLs
3. Modificar `addDocument` para fazer upload
4. Adicionar função de download/visualização

---

## 📦 Estrutura de Dados

### **Antes (LocalStorage/IndexedDB)**

```javascript
// Assinatura
localStorage.setItem('appointment_signature_123', 'data:image/png;base64,...');

// Fotos (metadata)
appointment_photos_123 = [
  {id: 'photo-1', name: 'foto1.jpg', type: 'image/jpeg', size: 123456}
];
// Blob no IndexedDB

// Documentos (metadata)
patient_documents_456 = [
  {
    id: 'doc-1',
    name: 'rx.pdf',
    type: 'application/pdf',
    size: 234567,
    uploadedBy: 'user-1',
    uploadedByName: 'Dr. João',
    uploadedAt: '2026-02-19T10:00:00Z'
  }
];
// Blob no IndexedDB
```

### **Depois (Supabase)**

```javascript
// Assinatura
appointments.signature_url = 'https://...supabase.co/storage/v1/object/public/appointment-signatures/clinic-1/patient-1/appt-1.png';

// Fotos
appointments.photos = [
  {
    id: 'photo-1',
    name: 'foto1.jpg',
    url: 'https://...supabase.co/storage/v1/object/public/appointment-photos/clinic-1/patient-1/appt-1/photo-1.jpg',
    type: 'image/jpeg',
    size: 123456
  }
];

// Documentos
patient_documents (tabela) = [
  {
    id: 'uuid-1',
    patient_id: 'patient-1',
    clinic_id: 'clinic-1',
    file_name: 'rx.pdf',
    file_type: 'application/pdf',
    file_size: 234567,
    storage_path: 'clinic-1/patient-1/doc-1.pdf',
    storage_url: 'https://...supabase.co/storage/v1/object/public/patient-documents/clinic-1/patient-1/doc-1.pdf',
    uploaded_by: 'user-1',
    uploaded_at: '2026-02-19T10:00:00Z'
  }
];
```

---

## ⚠️ Considerações

### **Tamanho de Arquivos**
- Supabase Storage: Limite padrão de 50MB por arquivo (configurável)
- Atual: MAX_FILE_SIZE = 50MB (já compatível)

### **Performance**
- IndexedDB: Acesso local rápido
- Supabase Storage: Requer download (CDN ajuda)
- Solução: Cache local opcional

### **Compatibilidade**
- Manter IndexedDB como fallback temporário
- Migração gradual: novos uploads vão direto para Storage
- Dados antigos migrados sob demanda ou em batch

### **Segurança**
- RLS policies garantem isolamento por clinic_id
- URLs podem ser públicas (com path difícil de adivinhar) ou privadas (signed URLs)
- Recomendação: Usar buckets privados + signed URLs com expiração

---

## 🚀 Próximos Passos

1. ✅ Análise completa (este documento)
2. 🔜 Configurar buckets no Supabase
3. 🔜 Criar tabela patient_documents
4. 🔜 Implementar funções de upload
5. 🔜 Implementar migração de dados
6. 🔜 Atualizar código da aplicação
7. 🔜 Testar upload/download
8. 🔜 Limpar IndexedDB/LocalStorage após migração
