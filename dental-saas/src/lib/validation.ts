import { z } from "zod";

// ─── Reusable UUID validator ─────────────────────────────────
export const uuidSchema = z.string().uuid("ID inválido");

// ─── Patients ────────────────────────────────────────────────
export const createPatientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  codigo: z.string().max(50).default(""),
  phone: z.string().max(30).default(""),
  email: z.string().email("Email inválido").or(z.literal("")).default(""),
  birth_date: z.string().nullable().default(null),
  address: z.string().max(500).default(""),
  responsavel_clinico_id: z.string().max(100).default(""),
  responsavel_orto_id: z.string().max(100).default(""),
});

export const updatePatientSchema = createPatientSchema.extend({
  id: uuidSchema,
});

// ─── Professionals ───────────────────────────────────────────
export const createProfessionalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  specialty: z.string().max(200).default(""),
});

export const updateProfessionalSchema = createProfessionalSchema.extend({
  id: uuidSchema,
  active: z.boolean().default(true),
});

// ─── Financial: Transactions ─────────────────────────────────
export const createTransactionSchema = z.object({
  type: z.enum(["IN", "OUT"], { message: "Tipo inválido" }),
  total_amount: z.number().positive("Valor deve ser positivo"),
  patient_id: z.string().uuid().nullable().default(null),
  payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer", "check", "other"]).default("cash"),
  transaction_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  description: z.string().max(500).default(""),
  receivable_id: z.string().uuid().nullable().default(null),
  entries: z.array(z.object({
    category_id: z.string().uuid().nullable().default(null),
    cost_center_id: z.string().uuid().nullable().default(null),
    amount: z.number().positive("Valor do rateio deve ser positivo"),
  })).default([]),
});

// ─── Financial: Receivables ──────────────────────────────────
export const createReceivableSchema = z.object({
  patient_id: z.string().uuid().nullable().default(null),
  amount: z.number().positive("Valor deve ser positivo"),
  due_date: z.string().min(1, "Vencimento é obrigatório"),
  description: z.string().max(500).default(""),
  origin_type: z.enum(["ortho_contract", "procedure", "manual", "installment"]).default("manual"),
});

export const createInstallmentPlanSchema = z.object({
  patient_id: z.string().uuid().nullable().default(null),
  total_amount: z.number().positive("Valor deve ser positivo"),
  num_installments: z.number().int().min(2, "Mínimo 2 parcelas"),
  first_due_date: z.string().min(1, "Data é obrigatória"),
  description: z.string().max(500).default(""),
});

// ─── Financial: Payables ─────────────────────────────────────
export const createPayableSchema = z.object({
  supplier: z.string().max(300).default(""),
  amount: z.number().positive("Valor deve ser positivo"),
  due_date: z.string().min(1, "Vencimento é obrigatório"),
  category_id: z.string().uuid().nullable().default(null),
  cost_center_id: z.string().uuid().nullable().default(null),
  description: z.string().max(500).default(""),
});

// ─── Financial: Ortho Contract ───────────────────────────────
export const createOrthoContractSchema = z.object({
  patient_id: uuidSchema,
  monthly_amount: z.number().positive("Valor mensal deve ser positivo"),
  total_months: z.number().int().min(1).max(120).default(24),
  due_day: z.number().int().min(1).max(28).default(10),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  notes: z.string().max(1000).default(""),
});

// ─── Financial: Categories & Cost Centers ────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  type: z.enum(["IN", "OUT"], { message: "Tipo inválido" }),
});

export const createCostCenterSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
});

// ─── Renegotiation ───────────────────────────────────────────
export const renegotiateSchema = z.object({
  ids: z.array(uuidSchema).min(1, "Selecione ao menos uma conta"),
  numInstallments: z.number().int().min(2),
  firstDueDate: z.string().min(1),
});

// ─── Waitlist ────────────────────────────────────────────────
export const createWaitlistEntrySchema = z.object({
  patient_id: uuidSchema,
  specialty: z.string().max(200).default(""),
  preferred_professional_id: z.string().uuid().nullable().default(null),
  priority: z.number().int().min(0).max(10).default(0),
  notes: z.string().max(1000).default(""),
});

// ─── Budgets ─────────────────────────────────────────────────
export const createBudgetSchema = z.object({
  patient_id: z.string().uuid().nullable().default(null),
  type: z.enum(["ORTHO", "SPECIALTY"], { message: "Tipo de orçamento é obrigatório" }),
  ortho_type: z.enum(["TRADICIONAL", "INVISALIGN"]).nullable().default(null),
  model: z.string().default(""),
  monthly_value: z.number().min(0).default(0),
  installments: z.number().int().min(1).default(36),
  total: z.number().min(0).default(0),
  cash_value: z.number().min(0).default(0),
  upsells: z.array(z.unknown()).default([]),
  items: z.array(z.unknown()).default([]),
  due_day: z.number().int().min(1).max(28).nullable().default(null),
  is_cash: z.boolean().default(false),
  is_plan_complement: z.boolean().default(false),
  notes: z.string().max(2000).default(""),
  status: z.enum(["pending", "approved", "cancelled"]).default("pending"),
});

// ─── Helper: Extract FormData into object ────────────────────
export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      obj[key] = value;
    }
  });
  return obj;
}
