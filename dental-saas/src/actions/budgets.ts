"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBudget(data: {
  patient_id: string | null;
  type: string;
  ortho_type: string | null;
  model: string;
  monthly_value: number;
  installments: number;
  total: number;
  cash_value: number;
  upsells: unknown[];
  items: unknown[];
  due_day: number | null;
  is_cash: boolean;
  is_plan_complement: boolean;
  notes: string;
  status: string;
}): Promise<{ error?: string; id?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!data.type) return { error: "Tipo de orçamento é obrigatório" };

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({
      patient_id: data.patient_id || null,
      type: data.type,
      ortho_type: data.ortho_type || null,
      model: data.model,
      monthly_value: data.monthly_value,
      installments: data.installments,
      total: data.total,
      cash_value: data.cash_value,
      upsells: data.upsells,
      items: data.items,
      due_day: data.due_day,
      is_cash: data.is_cash,
      is_plan_complement: data.is_plan_complement,
      notes: data.notes,
      status: data.status,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: `Erro ao criar orçamento: ${error.message}` };

  revalidatePath("/budgets");
  return { id: budget.id };
}

export async function updateBudgetStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("budgets")
    .update({ status })
    .eq("id", id);

  if (error) return { error: `Erro: ${error.message}` };

  revalidatePath("/budgets");
  return {};
}

export async function deleteBudget(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: `Erro: ${error.message}` };
  revalidatePath("/budgets");
  return {};
}
