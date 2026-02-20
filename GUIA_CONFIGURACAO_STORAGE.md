# 📦 Guia de Configuração: Supabase Storage

Este guia explica como configurar os buckets do Supabase Storage para armazenar assinaturas, fotos clínicas e documentos dos pacientes.

---

## 🎯 Buckets a Criar

### 1. **`appointment-signatures`**
- Armazena assinaturas de atendimentos (PNG)
- Privado com RLS
- Path: `{clinic_id}/{patient_id}/{appointment_id}.png`

### 2. **`appointment-photos`**
- Armazena fotos clínicas de atendimentos
- Privado com RLS
- Path: `{clinic_id}/{patient_id}/{appointment_id}/{photo_id}.{ext}`

### 3. **`patient-documents`**
- Armazena documentos anexados aos pacientes
- Privado com RLS
- Path: `{clinic_id}/{patient_id}/{document_id}.{ext}`

---

## 📋 Passo a Passo

### **Passo 1: Acessar Storage**

1. Acesse: https://supabase.com/dashboard/project/bzixxdtbktsztdtpadwh
2. Clique em **Storage** no menu lateral

---

### **Passo 2: Criar Bucket `appointment-signatures`**

1. Clique em **New bucket**
2. Preencha:
   - **Name**: `appointment-signatures`
   - **Public bucket**: ❌ **Desmarcar** (bucket privado)
   - **File size limit**: 5 MB (assinaturas são pequenas)
   - **Allowed MIME types**: `image/png`
3. Clique em **Create bucket**

#### **Configurar RLS Policies**

1. Clique no bucket `appointment-signatures`
2. Vá na aba **Policies**
3. Clique em **New policy**

**Policy 1: SELECT (Download)**
```sql
-- Nome: Users can view signatures from their clinic
-- Operation: SELECT
-- Policy definition:
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 2: INSERT (Upload)**
```sql
-- Nome: Users can upload signatures to their clinic
-- Operation: INSERT
-- Policy definition:
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 3: DELETE**
```sql
-- Nome: Admins can delete signatures from their clinic
-- Operation: DELETE
-- Policy definition:
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('ADMIN', 'OWNER')
)
```

---

### **Passo 3: Criar Bucket `appointment-photos`**

1. Clique em **New bucket**
2. Preencha:
   - **Name**: `appointment-photos`
   - **Public bucket**: ❌ **Desmarcar**
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
3. Clique em **Create bucket**

#### **Configurar RLS Policies**

**Policy 1: SELECT**
```sql
-- Nome: Users can view photos from their clinic
-- Operation: SELECT
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 2: INSERT**
```sql
-- Nome: Users can upload photos to their clinic
-- Operation: INSERT
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 3: DELETE**
```sql
-- Nome: Admins can delete photos from their clinic
-- Operation: DELETE
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('ADMIN', 'OWNER')
)
```

---

### **Passo 4: Criar Bucket `patient-documents`**

1. Clique em **New bucket**
2. Preencha:
   - **Name**: `patient-documents`
   - **Public bucket**: ❌ **Desmarcar**
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Clique em **Create bucket**

#### **Configurar RLS Policies**

**Policy 1: SELECT**
```sql
-- Nome: Users can view documents from their clinic
-- Operation: SELECT
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 2: INSERT**
```sql
-- Nome: Users can upload documents to their clinic
-- Operation: INSERT
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
)
```

**Policy 3: DELETE**
```sql
-- Nome: Admins can delete documents from their clinic
-- Operation: DELETE
(storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('ADMIN', 'OWNER')
)
```

---

## ✅ Verificação

Após criar os buckets, você deve ver:

- ✅ `appointment-signatures` (privado, 5MB, image/png)
- ✅ `appointment-photos` (privado, 50MB, imagens)
- ✅ `patient-documents` (privado, 50MB, imagens + PDF + DOCX)

Cada bucket deve ter **3 policies**: SELECT, INSERT, DELETE

---

## 🔧 Alternativa: Criar via SQL

Se preferir, você pode criar as policies via SQL Editor:

```sql
-- Policy para appointment-signatures (SELECT)
CREATE POLICY "Users can view signatures from their clinic"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'appointment-signatures' AND
  (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- Policy para appointment-signatures (INSERT)
CREATE POLICY "Users can upload signatures to their clinic"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'appointment-signatures' AND
  (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- Policy para appointment-signatures (DELETE)
CREATE POLICY "Admins can delete signatures from their clinic"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'appointment-signatures' AND
  (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'OWNER')
  )
);

-- Repetir para os outros buckets...
```

---

## 📝 Próximos Passos

Após configurar os buckets:

1. ✅ Criar tabela `patient_documents` (SQL)
2. ✅ Implementar funções de upload no código
3. ✅ Testar upload de arquivo
4. ✅ Migrar dados existentes

---

## 🐛 Troubleshooting

### **Erro: "new row violates row-level security policy"**
- Verifique se as policies foram criadas corretamente
- Verifique se o usuário tem perfil na tabela `profiles`
- Verifique se o `clinic_id` está correto

### **Erro: "File size exceeds limit"**
- Ajuste o limite do bucket
- Comprima o arquivo antes de fazer upload

### **Erro: "MIME type not allowed"**
- Adicione o tipo MIME na configuração do bucket
- Ou remova a restrição de MIME types

---

## 📊 Estrutura de Paths

### **Assinaturas**
```
appointment-signatures/
  └── {clinic_id}/
      └── {patient_id}/
          └── {appointment_id}.png
```

### **Fotos**
```
appointment-photos/
  └── {clinic_id}/
      └── {patient_id}/
          └── {appointment_id}/
              ├── photo-1.jpg
              ├── photo-2.jpg
              └── photo-3.png
```

### **Documentos**
```
patient-documents/
  └── {clinic_id}/
      └── {patient_id}/
          ├── doc-1.pdf
          ├── doc-2.jpg
          └── doc-3.docx
```

---

**Quando terminar a configuração, me avise para continuar com a criação da tabela `patient_documents`!** 🚀
