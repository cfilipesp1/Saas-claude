"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createTransactionSchema,
  createReceivableSchema,
  createInstallmentPlanSchema,
  createPayableSchema,
  createOrthoContractSchema,
  createCategorySchema,
  createCostCenterSchema,
  renegotiateSchema,
  uuidSchema,
} from "@/lib/validation";
import { logger } from "@/lib/logger";
import type { ReceivableStatus } from "@/lib/types";

// ─── Transactions (Recebimento / Despesa) ────────────────────

export async function createTransaction(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let entries: { category_id: string | null; cost_center_id: string | null; amount: number }[] = [];
  const entriesJson = formData.get("entries") as string;
  if (entriesJson) {
    try {
      entries = JSON.parse(entriesJson);
    } catch {
      return { error: "Formato de rateio inválido" };
    }
  }

  const raw = {
    type: (formData.get("type") as string) ?? "",
    total_amount: parseFloat(formData.get("total_amount") as string),
    patient_id: (formData.get("patient_id") as string) || null,
    payment_method: (formData.get("payment_method") as string) || "cash",
    transaction_date: (formData.get("transaction_date") as string) || new Date().toISOString().split("T")[0],
    description: (formData.get("description") as string) || "",
    receivable_id: (formData.get("receivable_id") as string) || null,
    entries,
  };

  const parsed = createTransactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use atomic stored procedure
  const entriesPayload = parsed.data.entries.length > 0
    ? JSON.stringify(parsed.data.entries)
    : "[]";

  const { error } = await supabase.rpc("create_transaction_atomic", {
    p_type: parsed.data.type,
    p_patient_id: parsed.data.patient_id,
    p_total_amount: parsed.data.total_amount,
    p_payment_method: parsed.data.payment_method,
    p_transaction_date: parsed.data.transaction_date,
    p_description: parsed.data.description,
    p_created_by: user?.id ?? null,
    p_entries: entriesPayload,
    p_receivable_id: parsed.data.receivable_id,
  });

  if (error) {
    logger.error("createTransaction atomic failed", error, "financial.createTransaction");
    return { error: `Erro ao criar transação: ${error.message}` };
  }

  revalidatePath("/financial");
  return {};
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("financial_transactions").delete().eq("id", parsed.data);
  if (error) {
    logger.error("deleteTransaction failed", error, "financial.deleteTransaction");
    return { error: `Erro ao excluir: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

// ─── Receivables ─────────────────────────────────────────────

export async function createReceivable(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    patient_id: (formData.get("patient_id") as string) || null,
    amount: parseFloat(formData.get("amount") as string),
    due_date: (formData.get("due_date") as string) ?? "",
    description: (formData.get("description") as string) || "",
    origin_type: (formData.get("origin_type") as string) || "manual",
  };

  const parsed = createReceivableSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("receivables").insert({
    patient_id: parsed.data.patient_id,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    description: parsed.data.description,
    origin_type: parsed.data.origin_type,
    status: "open",
  });

  if (error) {
    logger.error("createReceivable failed", error, "financial.createReceivable");
    return { error: `Erro ao criar: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function createInstallmentPlan(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    patient_id: (formData.get("patient_id") as string) || null,
    total_amount: parseFloat(formData.get("total_amount") as string),
    num_installments: parseInt(formData.get("num_installments") as string, 10),
    first_due_date: (formData.get("first_due_date") as string) ?? "",
    description: (formData.get("description") as string) || "",
  };

  const parsed = createInstallmentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { total_amount, num_installments, first_due_date, patient_id, description } = parsed.data;
  const installment_amount = Math.round((total_amount / num_installments) * 100) / 100;
  const remainder = Math.round((total_amount - installment_amount * num_installments) * 100) / 100;

  const rows = [];
  const baseDate = new Date(first_due_date + "T12:00:00");
  for (let i = 0; i < num_installments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const amt = i === 0 ? installment_amount + remainder : installment_amount;
    rows.push({
      patient_id,
      origin_type: "installment" as const,
      installment_num: i + 1,
      total_installments: num_installments,
      due_date: dueDate.toISOString().split("T")[0],
      amount: amt,
      status: "open" as const,
      description: description || `Parcela ${i + 1}/${num_installments}`,
    });
  }

  const { error } = await supabase.from("receivables").insert(rows);
  if (error) {
    logger.error("createInstallmentPlan failed", error, "financial.createInstallmentPlan");
    return { error: `Erro ao criar parcelas: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function settleReceivable(
  id: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { error: "ID inválido" };
  if (paidAmount < 0) return { error: "Valor inválido" };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Use atomic stored procedure
  const { error } = await supabase.rpc("settle_receivable_atomic", {
    p_receivable_id: parsedId.data,
    p_paid_amount: paidAmount,
    p_user_id: user?.id ?? null,
  });

  if (error) {
    logger.error("settleReceivable atomic failed", error, "financial.settleReceivable");
    return { error: `Erro ao dar baixa: ${error.message}` };
  }

  revalidatePath("/financial");
  return {};
}

export async function renegotiateReceivables(
  ids: string[],
  numInstallments: number,
  firstDueDate: string
): Promise<{ error?: string }> {
  const parsed = renegotiateSchema.safeParse({ ids, numInstallments, firstDueDate });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabase();

  const { data: existing } = await supabase
    .from("receivables")
    .select("*")
    .in("id", parsed.data.ids)
    .eq("status", "open");

  if (!existing || existing.length === 0) return { error: "Nenhuma conta selecionada" };

  const totalRemaining = existing.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
  const patient_id = existing[0].patient_id;

  const { error: cancelError } = await supabase
    .from("receivables")
    .update({ status: "renegotiated" as ReceivableStatus })
    .in("id", parsed.data.ids);

  if (cancelError) {
    logger.error("renegotiateReceivables cancel failed", cancelError, "financial.renegotiate");
    return { error: `Erro ao renegociar: ${cancelError.message}` };
  }

  const installment_amount = Math.round((totalRemaining / parsed.data.numInstallments) * 100) / 100;
  const remainder = Math.round((totalRemaining - installment_amount * parsed.data.numInstallments) * 100) / 100;

  const rows = [];
  const baseDate = new Date(parsed.data.firstDueDate + "T12:00:00");
  for (let i = 0; i < parsed.data.numInstallments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const amt = i === 0 ? installment_amount + remainder : installment_amount;
    rows.push({
      patient_id,
      origin_type: "installment" as const,
      installment_num: i + 1,
      total_installments: parsed.data.numInstallments,
      due_date: dueDate.toISOString().split("T")[0],
      amount: amt,
      status: "open" as const,
      description: `Renegociação - Parcela ${i + 1}/${parsed.data.numInstallments}`,
    });
  }

  const { error } = await supabase.from("receivables").insert(rows);
  if (error) {
    logger.error("renegotiateReceivables insert failed", error, "financial.renegotiate");
    return { error: `Erro ao criar novas parcelas: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function deleteReceivable(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("receivables").delete().eq("id", parsed.data);
  if (error) {
    logger.error("deleteReceivable failed", error, "financial.deleteReceivable");
    return { error: `Erro: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

// ─── Payables ────────────────────────────────────────────────

export async function createPayable(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    supplier: (formData.get("supplier") as string) || "",
    amount: parseFloat(formData.get("amount") as string),
    due_date: (formData.get("due_date") as string) ?? "",
    category_id: (formData.get("category_id") as string) || null,
    cost_center_id: (formData.get("cost_center_id") as string) || null,
    description: (formData.get("description") as string) || "",
  };

  const parsed = createPayableSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("payables").insert({
    supplier: parsed.data.supplier,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    category_id: parsed.data.category_id,
    cost_center_id: parsed.data.cost_center_id,
    description: parsed.data.description,
    status: "open",
  });

  if (error) {
    logger.error("createPayable failed", error, "financial.createPayable");
    return { error: `Erro ao criar: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function settlePayable(
  id: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { error: "ID inválido" };
  if (paidAmount < 0) return { error: "Valor inválido" };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Use atomic stored procedure
  const { error } = await supabase.rpc("settle_payable_atomic", {
    p_payable_id: parsedId.data,
    p_paid_amount: paidAmount,
    p_user_id: user?.id ?? null,
  });

  if (error) {
    logger.error("settlePayable atomic failed", error, "financial.settlePayable");
    return { error: `Erro ao pagar: ${error.message}` };
  }

  revalidatePath("/financial");
  return {};
}

export async function deletePayable(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("payables").delete().eq("id", parsed.data);
  if (error) {
    logger.error("deletePayable failed", error, "financial.deletePayable");
    return { error: `Erro: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

// ─── Categories & Cost Centers ───────────────────────────────

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    name: ((formData.get("name") as string) ?? "").trim(),
    type: (formData.get("type") as string) ?? "",
  };

  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    type: parsed.data.type,
  });
  if (error) {
    logger.error("createCategory failed", error, "financial.createCategory");
    return { error: `Erro: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", parsed.data);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function createCostCenter(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    name: ((formData.get("name") as string) ?? "").trim(),
  };

  const parsed = createCostCenterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("cost_centers").insert({ name: parsed.data.name });
  if (error) {
    logger.error("createCostCenter failed", error, "financial.createCostCenter");
    return { error: `Erro: ${error.message}` };
  }
  revalidatePath("/financial");
  return {};
}

export async function deleteCostCenter(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cost_centers").delete().eq("id", parsed.data);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

// ─── Ortho Contracts ─────────────────────────────────────────

export async function getOrthoReceivables(contractId: string) {
  const parsed = uuidSchema.safeParse(contractId);
  if (!parsed.success) return [];

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("receivables")
    .select("*, patient:patients(id, name)")
    .eq("origin_type", "ortho_contract")
    .eq("origin_id", parsed.data)
    .order("due_date");
  return data ?? [];
}

export async function createOrthoContract(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    patient_id: (formData.get("patient_id") as string) ?? "",
    monthly_amount: parseFloat(formData.get("monthly_amount") as string),
    total_months: parseInt(formData.get("total_months") as string, 10) || 24,
    due_day: parseInt(formData.get("due_day") as string, 10) || 10,
    start_date: (formData.get("start_date") as string) ?? "",
    notes: (formData.get("notes") as string) || "",
  };

  const parsed = createOrthoContractSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use atomic stored procedure
  const { error } = await supabase.rpc("create_ortho_contract_atomic", {
    p_patient_id: parsed.data.patient_id,
    p_monthly_amount: parsed.data.monthly_amount,
    p_total_months: parsed.data.total_months,
    p_due_day: parsed.data.due_day,
    p_start_date: parsed.data.start_date,
    p_notes: parsed.data.notes,
  });

  if (error) {
    logger.error("createOrthoContract atomic failed", error, "financial.createOrthoContract");
    return { error: `Erro ao criar contrato: ${error.message}` };
  }

  revalidatePath("/financial");
  return {};
}

export async function cancelOrthoContract(id: string): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();

  const { error: contractError } = await supabase
    .from("ortho_contracts")
    .update({ status: "cancelled" })
    .eq("id", parsedId.data);

  if (contractError) {
    logger.error("cancelOrthoContract failed", contractError, "financial.cancelOrthoContract");
    return { error: `Erro: ${contractError.message}` };
  }

  await supabase
    .from("receivables")
    .update({ status: "renegotiated" as ReceivableStatus })
    .eq("origin_id", parsedId.data)
    .eq("origin_type", "ortho_contract")
    .eq("status", "open");

  revalidatePath("/financial");
  return {};
}
