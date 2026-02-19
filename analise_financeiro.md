# Análise: Módulo Financeiro

## 📊 Estrutura Atual (LocalStorage)

### **Objeto `financeiro` no paciente**

```javascript
financeiro: {
  orcamento_total: 0,  // number
  pagamentos: []       // array de objetos
}
```

### **Estrutura de Pagamento**

```javascript
{
  id: "uuid",
  data: "2024-01-15",                    // ISO date string
  valor: 150.00,                         // number
  forma_pagamento: "avista|parcelado",   // string
  observacao: "Parcela 1/12",            // string
  registrado_por: "Dr. João",            // string (nome do usuário)
  registrado_em: "2024-01-15T10:30:00Z"  // ISO datetime string
}
```

---

## 🎯 Funcionalidades Atuais

### **1. Orçamento Total**
- **Função**: `saveOrcamento(patientId, valor)`
- **Ação**: Atualiza `financeiro.orcamento_total`
- **Auditoria**: "ATUALIZAR_ORCAMENTO"

### **2. Adicionar Pagamento**
- **Função**: `addPagamento(patientId)`
- **Ação**: Adiciona novo pagamento ao array `financeiro.pagamentos`
- **Auditoria**: "ADICIONAR_PAGAMENTO"
- **Validação**: Valor > 0

### **3. Remover Pagamento**
- **Função**: `removePagamento(patientId, pagamentoId)`
- **Ação**: Remove pagamento do array
- **Auditoria**: "REMOVER_PAGAMENTO"
- **Confirmação**: Sim

### **4. Cálculos**
```javascript
totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0)
valorAberto = orcamento_total - totalPago
statusFinanceiro = 
  - "sem_orcamento" (orcamento_total === 0)
  - "pago" (valorAberto === 0)
  - "parcial" (totalPago > 0 && valorAberto > 0)
  - "aberto" (totalPago === 0 && valorAberto > 0)
```

---

## 🗄️ Migração para Supabase

### **Tabela 1: `patient_budgets`**

Armazena o orçamento total de cada paciente.

```sql
CREATE TABLE patient_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Orçamento
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: Um orçamento por paciente
  UNIQUE(patient_id)
);
```

**Observação**: Cada paciente tem **apenas um orçamento** (total_amount). Quando o orçamento é atualizado, o mesmo registro é modificado.

---

### **Tabela 2: `payments`**

Armazena todos os pagamentos realizados.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Dados do pagamento
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('avista', 'parcelado')),
  notes TEXT,
  
  -- Auditoria
  registered_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔄 Mapeamento de Dados

### **LocalStorage → Supabase**

#### **Orçamento**
```
financeiro.orcamento_total → patient_budgets.total_amount
```

#### **Pagamentos**
```
financeiro.pagamentos[].id              → payments.id
financeiro.pagamentos[].data            → payments.payment_date
financeiro.pagamentos[].valor           → payments.amount
financeiro.pagamentos[].forma_pagamento → payments.payment_method
financeiro.pagamentos[].observacao      → payments.notes
financeiro.pagamentos[].registrado_por  → profiles.full_name (via registered_by FK)
financeiro.pagamentos[].registrado_em   → payments.registered_at
```

---

## 📝 Funções CRUD a Implementar

### **Orçamentos**

1. **`createOrUpdateBudgetSupabase(patientId, totalAmount)`**
   - UPSERT em `patient_budgets`
   - Atualiza `total_amount`
   - Registra `updated_by` e `updated_at`

2. **`loadBudgetSupabase(patientId)`**
   - SELECT de `patient_budgets` WHERE `patient_id`
   - Retorna `total_amount` ou 0

### **Pagamentos**

1. **`createPaymentSupabase(patientId, paymentData)`**
   - INSERT em `payments`
   - Registra `registered_by` e `registered_at`

2. **`loadPaymentsSupabase(patientId)`**
   - SELECT de `payments` WHERE `patient_id`
   - ORDER BY `payment_date` DESC
   - JOIN com `profiles` para obter `registered_by_name`

3. **`deletePaymentSupabase(paymentId)`**
   - DELETE de `payments` WHERE `id`

---

## 🔄 Fluxo de Migração

### **Ao abrir paciente:**

1. Carregar orçamento do Supabase
2. Carregar pagamentos do Supabase
3. Se não houver dados no Supabase, verificar LocalStorage
4. Se houver dados antigos, oferecer migração

### **Migração de dados antigos:**

```javascript
async function migrateFinanceiroToSupabase(patientId) {
  const oldFinanceiro = getLocalData('financeiro', patientId);
  
  if (!oldFinanceiro) return;
  
  // Migrar orçamento
  if (oldFinanceiro.orcamento_total > 0) {
    await createOrUpdateBudgetSupabase(patientId, oldFinanceiro.orcamento_total);
  }
  
  // Migrar pagamentos
  for (const pagamento of oldFinanceiro.pagamentos) {
    await createPaymentSupabase(patientId, {
      payment_date: pagamento.data,
      amount: pagamento.valor,
      payment_method: pagamento.forma_pagamento,
      notes: pagamento.observacao,
      registered_at: pagamento.registrado_em
    });
  }
  
  // Limpar dados antigos
  localStorage.removeItem(`patient_financeiro_${patientId}`);
}
```

---

## 📊 Relatórios

Os relatórios financeiros precisam ser ajustados para buscar dados do Supabase:

```javascript
// ANTES: Busca do LocalStorage
const valorTotal = patient.financeiro?.orcamento_total || 0;
const totalPago = patient.financeiro?.pagamentos.reduce((sum, p) => sum + p.valor, 0) || 0;

// DEPOIS: Busca do Supabase
const budget = await loadBudgetSupabase(patient.id);
const payments = await loadPaymentsSupabase(patient.id);
const valorTotal = budget?.total_amount || 0;
const totalPago = payments.reduce((sum, p) => sum + p.amount, 0);
```

---

## 🎯 Benefícios da Migração

| Antes (LocalStorage) | Depois (Supabase) |
|---------------------|-------------------|
| ❌ Dados apenas no navegador | ✅ Dados na nuvem |
| ❌ Sem histórico de alterações | ✅ Auditoria completa (created_by, updated_by) |
| ❌ Sem relatórios consolidados | ✅ Queries SQL para relatórios complexos |
| ❌ Difícil de compartilhar | ✅ Multi-usuário |
| ❌ Sem backup | ✅ Backup automático |
| ❌ Limite de armazenamento | ✅ Armazenamento ilimitado |

---

## 🔒 Segurança (RLS)

### **patient_budgets**
- SELECT: Usuários da mesma clínica
- INSERT/UPDATE: Usuários da mesma clínica
- DELETE: ADMIN/OWNER da mesma clínica

### **payments**
- SELECT: Usuários da mesma clínica
- INSERT: Usuários da mesma clínica (ADMIN/RECEPCAO)
- DELETE: ADMIN/OWNER da mesma clínica

---

## ✅ Checklist de Implementação

- [ ] Criar tabela `patient_budgets`
- [ ] Criar tabela `payments`
- [ ] Implementar `createOrUpdateBudgetSupabase`
- [ ] Implementar `loadBudgetSupabase`
- [ ] Implementar `createPaymentSupabase`
- [ ] Implementar `loadPaymentsSupabase`
- [ ] Implementar `deletePaymentSupabase`
- [ ] Modificar `saveOrcamento` para usar Supabase
- [ ] Modificar `addPagamento` para usar Supabase
- [ ] Modificar `removePagamento` para usar Supabase
- [ ] Implementar migração automática
- [ ] Atualizar relatórios para usar Supabase
- [ ] Testar CRUD completo
- [ ] Testar migração de dados antigos

---

## 📁 Estrutura Final

```
patient
├── id
├── name
├── ...
└── financeiro (objeto híbrido temporário)
    ├── orcamento_total (carregado do Supabase)
    └── pagamentos (carregado do Supabase)
```

**Após migração completa:**
- Orçamento: `patient_budgets` table
- Pagamentos: `payments` table
- LocalStorage: Vazio (limpo após migração)
