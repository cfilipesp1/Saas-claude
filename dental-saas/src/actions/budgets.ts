"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createBudgetSchema, uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function createBudget(data: z.input<typeof createBudgetSchema>): Promise<{ error?: string; id?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parsed = createBudgetSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({
      patient_id: parsed.data.patient_id || null,
      type: parsed.data.type,
      ortho_type: parsed.data.ortho_type || null,
      model: parsed.data.model,
      monthly_value: parsed.data.monthly_value,
      installments: parsed.data.installments,
      total: parsed.data.total,
      cash_value: parsed.data.cash_value,
      upsells: parsed.data.upsells,
      items: parsed.data.items,
      due_day: parsed.data.due_day,
      is_cash: parsed.data.is_cash,
      is_plan_complement: parsed.data.is_plan_complement,
      notes: parsed.data.notes,
      status: parsed.data.status,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("createBudget failed", error, "budgets.create");
    return { error: `Erro ao criar orçamento: ${error.message}` };
  }

  revalidatePath("/budgets");
  return { id: budget.id };
}

export async function updateBudgetStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { error: "ID inválido" };

  const validStatuses = ["pending", "approved", "cancelled"];
  if (!validStatuses.includes(status)) return { error: "Status inválido" };

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("budgets")
    .update({ status })
    .eq("id", parsedId.data);

  if (error) {
    logger.error("updateBudgetStatus failed", error, "budgets.updateStatus");
    return { error: `Erro: ${error.message}` };
  }

  revalidatePath("/budgets");
  return {};
}

export async function deleteBudget(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("budgets").delete().eq("id", parsed.data);
  if (error) {
    logger.error("deleteBudget failed", error, "budgets.delete");
    return { error: `Erro: ${error.message}` };
  }
  revalidatePath("/budgets");
  return {};
}
