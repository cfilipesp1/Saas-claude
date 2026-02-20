"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfessionals() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("professionals")
    .select("*")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function createProfessional(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Nome é obrigatório" };
  }
  const specialty = formData.get("specialty") as string;

  const { error } = await supabase.from("professionals").insert({
    name: name.trim(),
    specialty: specialty || "",
  });

  if (error) {
    console.error("createProfessional error:", error);
    return { error: `Erro ao criar profissional: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/professionals");
  return {};
}

export async function updateProfessional(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;
  const name = formData.get("name");
  if (!id || !name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "ID e nome são obrigatórios" };
  }
  const specialty = formData.get("specialty") as string;
  const active = formData.get("active") === "true";

  const { error } = await supabase
    .from("professionals")
    .update({ name: name.trim(), specialty, active })
    .eq("id", id);

  if (error) {
    console.error("updateProfessional error:", error);
    return { error: `Erro ao atualizar profissional: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/professionals");
  return {};
}

export async function deleteProfessional(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("professionals").delete().eq("id", id);

  if (error) {
    console.error("deleteProfessional error:", error);
    return { error: `Erro ao excluir profissional: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/professionals");
  return {};
}
