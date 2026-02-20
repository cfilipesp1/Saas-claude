"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReceivableStatus, PayableStatus } from "@/lib/types";

// ─── Transactions (Recebimento / Despesa) ────────────────────

export async function createTransaction(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const type = formData.get("type") as string;
  const total_amount = parseFloat(formData.get("total_amount") as string);
  if (!type || isNaN(total_amount) || total_amount <= 0) {
    return { error: "Tipo e valor são obrigatórios" };
  }

  const patient_id = (formData.get("patient_id") as string) || null;
  const payment_method = (formData.get("payment_method") as string) || "cash";
  const transaction_date = (formData.get("transaction_date") as string) || new Date().toISOString().split("T")[0];
  const description = (formData.get("description") as string) || "";
  const receivable_id = (formData.get("receivable_id") as string) || null;

  // Parse rateio entries from JSON
  const entriesJson = formData.get("entries") as string;
  let entries: { category_id: string | null; cost_center_id: string | null; amount: number }[] = [];
  if (entriesJson) {
    try {
      entries = JSON.parse(entriesJson);
    } catch {
      return { error: "Formato de rateio inválido" };
    }
  }

  // If no entries, create a single entry with full amount
  if (entries.length === 0) {
    entries = [{ category_id: null, cost_center_id: null, amount: total_amount }];
  }

  // Validate entries sum matches total
  const entriesSum = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(entriesSum - total_amount) > 0.01) {
    return { error: `Soma do rateio (${entriesSum.toFixed(2)}) difere do total (${total_amount.toFixed(2)})` };
  }

  const { data: tx, error: txError } = await supabase
    .from("financial_transactions")
    .insert({
      type,
      patient_id,
      total_amount,
      payment_method,
      transaction_date,
      description,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (txError) {
    return { error: `Erro ao criar transação: ${txError.message}` };
  }

  // Create rateio entries
  const entryRows = entries.map((e) => ({
    transaction_id: tx.id,
    category_id: e.category_id || null,
    cost_center_id: e.cost_center_id || null,
    amount: e.amount,
  }));

  const { error: entryError } = await supabase
    .from("financial_entries")
    .insert(entryRows);

  if (entryError) {
    console.error("Error creating financial entries:", entryError);
  }

  // Auto-settle receivable if linked
  if (receivable_id && type === "IN") {
    await supabase
      .from("receivables")
      .update({
        status: "paid" as ReceivableStatus,
        paid_amount: total_amount,
        paid_at: new Date().toISOString(),
      })
      .eq("id", receivable_id);
  }

  revalidatePath("/financial");
  return {};
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) return { error: `Erro ao excluir: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

// ─── Receivables ─────────────────────────────────────────────

export async function createReceivable(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const patient_id = (formData.get("patient_id") as string) || null;
  const amount = parseFloat(formData.get("amount") as string);
  const due_date = formData.get("due_date") as string;
  if (isNaN(amount) || amount <= 0 || !due_date) {
    return { error: "Valor e vencimento são obrigatórios" };
  }

  const description = (formData.get("description") as string) || "";
  const origin_type = (formData.get("origin_type") as string) || "manual";

  const { error } = await supabase.from("receivables").insert({
    patient_id,
    amount,
    due_date,
    description,
    origin_type,
    status: "open",
  });

  if (error) return { error: `Erro ao criar: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function createInstallmentPlan(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const patient_id = (formData.get("patient_id") as string) || null;
  const total_amount = parseFloat(formData.get("total_amount") as string);
  const num_installments = parseInt(formData.get("num_installments") as string, 10);
  const first_due_date = formData.get("first_due_date") as string;
  const description = (formData.get("description") as string) || "";

  if (isNaN(total_amount) || total_amount <= 0 || isNaN(num_installments) || num_installments < 2 || !first_due_date) {
    return { error: "Valor, número de parcelas (mín 2) e data são obrigatórios" };
  }

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
  if (error) return { error: `Erro ao criar parcelas: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function settleReceivable(
  id: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rec } = await supabase
    .from("receivables")
    .select("amount, patient_id")
    .eq("id", id)
    .single();

  if (!rec) return { error: "Conta não encontrada" };

  const status: ReceivableStatus = paidAmount >= rec.amount ? "paid" : "open";
  const newPaid = paidAmount;

  const { error } = await supabase
    .from("receivables")
    .update({
      status,
      paid_amount: newPaid,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: `Erro ao dar baixa: ${error.message}` };

  // Create corresponding transaction
  if (paidAmount > 0) {
    await supabase.from("financial_transactions").insert({
      type: "IN",
      patient_id: rec.patient_id,
      total_amount: paidAmount,
      payment_method: "cash",
      transaction_date: new Date().toISOString().split("T")[0],
      description: `Baixa de conta a receber`,
      created_by: user?.id ?? null,
    });
  }

  revalidatePath("/financial");
  return {};
}

export async function renegotiateReceivables(
  ids: string[],
  numInstallments: number,
  firstDueDate: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  // Get existing receivables
  const { data: existing } = await supabase
    .from("receivables")
    .select("*")
    .in("id", ids)
    .eq("status", "open");

  if (!existing || existing.length === 0) return { error: "Nenhuma conta selecionada" };

  const totalRemaining = existing.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
  const patient_id = existing[0].patient_id;

  // Mark originals as renegotiated
  const { error: cancelError } = await supabase
    .from("receivables")
    .update({ status: "renegotiated" as ReceivableStatus })
    .in("id", ids);

  if (cancelError) return { error: `Erro ao renegociar: ${cancelError.message}` };

  // Create new installments
  const installment_amount = Math.round((totalRemaining / numInstallments) * 100) / 100;
  const remainder = Math.round((totalRemaining - installment_amount * numInstallments) * 100) / 100;

  const rows = [];
  const baseDate = new Date(firstDueDate + "T12:00:00");
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const amt = i === 0 ? installment_amount + remainder : installment_amount;
    rows.push({
      patient_id,
      origin_type: "installment" as const,
      installment_num: i + 1,
      total_installments: numInstallments,
      due_date: dueDate.toISOString().split("T")[0],
      amount: amt,
      status: "open" as const,
      description: `Renegociação - Parcela ${i + 1}/${numInstallments}`,
    });
  }

  const { error } = await supabase.from("receivables").insert(rows);
  if (error) return { error: `Erro ao criar novas parcelas: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function deleteReceivable(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

// ─── Payables ────────────────────────────────────────────────

export async function createPayable(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const supplier = (formData.get("supplier") as string) || "";
  const amount = parseFloat(formData.get("amount") as string);
  const due_date = formData.get("due_date") as string;
  if (isNaN(amount) || amount <= 0 || !due_date) {
    return { error: "Valor e vencimento são obrigatórios" };
  }

  const category_id = (formData.get("category_id") as string) || null;
  const cost_center_id = (formData.get("cost_center_id") as string) || null;
  const description = (formData.get("description") as string) || "";

  const { error } = await supabase.from("payables").insert({
    supplier,
    amount,
    due_date,
    category_id,
    cost_center_id,
    description,
    status: "open",
  });

  if (error) return { error: `Erro ao criar: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function settlePayable(
  id: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: pay } = await supabase
    .from("payables")
    .select("amount, supplier, category_id, cost_center_id")
    .eq("id", id)
    .single();

  if (!pay) return { error: "Conta não encontrada" };

  const status: PayableStatus = paidAmount >= pay.amount ? "paid" : "open";

  const { error } = await supabase
    .from("payables")
    .update({
      status,
      paid_amount: paidAmount,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: `Erro ao pagar: ${error.message}` };

  // Create corresponding OUT transaction
  if (paidAmount > 0) {
    const { data: tx } = await supabase
      .from("financial_transactions")
      .insert({
        type: "OUT",
        total_amount: paidAmount,
        payment_method: "cash",
        transaction_date: new Date().toISOString().split("T")[0],
        description: `Pagamento: ${pay.supplier}`,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (tx && (pay.category_id || pay.cost_center_id)) {
      await supabase.from("financial_entries").insert({
        transaction_id: tx.id,
        category_id: pay.category_id,
        cost_center_id: pay.cost_center_id,
        amount: paidAmount,
      });
    }
  }

  revalidatePath("/financial");
  return {};
}

export async function deletePayable(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("payables").delete().eq("id", id);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

// ─── Categories & Cost Centers ───────────────────────────────

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;
  if (!name || !type) return { error: "Nome e tipo são obrigatórios" };

  const { error } = await supabase.from("categories").insert({ name, type });
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function createCostCenter(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório" };

  const { error } = await supabase.from("cost_centers").insert({ name });
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

export async function deleteCostCenter(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cost_centers").delete().eq("id", id);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/financial");
  return {};
}

// ─── Ortho Contracts ─────────────────────────────────────────

export async function getOrthoReceivables(contractId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("receivables")
    .select("*, patient:patients(id, name)")
    .eq("origin_type", "ortho_contract")
    .eq("origin_id", contractId)
    .order("due_date");
  return data ?? [];
}

export async function createOrthoContract(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const patient_id = formData.get("patient_id") as string;
  const monthly_amount = parseFloat(formData.get("monthly_amount") as string);
  const total_months = parseInt(formData.get("total_months") as string, 10);
  const due_day = parseInt(formData.get("due_day") as string, 10);
  const start_date = formData.get("start_date") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!patient_id || isNaN(monthly_amount) || monthly_amount <= 0 || !start_date) {
    return { error: "Paciente, valor mensal e data de início são obrigatórios" };
  }

  const { data: contract, error } = await supabase
    .from("ortho_contracts")
    .insert({
      patient_id,
      monthly_amount,
      total_months: total_months || 24,
      due_day: due_day || 10,
      start_date,
      notes,
      status: "active",
    })
    .select()
    .single();

  if (error) return { error: `Erro ao criar contrato: ${error.message}` };

  // Generate receivables for all months
  const months = total_months || 24;
  const rows = [];
  const baseDate = new Date(start_date + "T12:00:00");
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(due_day || 10);
    rows.push({
      patient_id,
      origin_type: "ortho_contract" as const,
      origin_id: contract.id,
      installment_num: i + 1,
      total_installments: months,
      due_date: dueDate.toISOString().split("T")[0],
      amount: monthly_amount,
      status: "open" as const,
      description: `Ortodontia - Mês ${i + 1}/${months}`,
    });
  }

  const { error: recError } = await supabase.from("receivables").insert(rows);
  if (recError) {
    console.error("Error generating ortho receivables:", recError);
  }

  revalidatePath("/financial");
  return {};
}

export async function cancelOrthoContract(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const { error: contractError } = await supabase
    .from("ortho_contracts")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (contractError) return { error: `Erro: ${contractError.message}` };

  // Cancel open receivables linked to this contract
  await supabase
    .from("receivables")
    .update({ status: "renegotiated" as ReceivableStatus })
    .eq("origin_id", id)
    .eq("origin_type", "ortho_contract")
    .eq("status", "open");

  revalidatePath("/financial");
  return {};
}
