"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createProfessionalSchema, updateProfessionalSchema, uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

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

  const raw = {
    name: (formData.get("name") as string) ?? "",
    specialty: (formData.get("specialty") as string) ?? "",
  };

  const parsed = createProfessionalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("professionals").insert({
    name: parsed.data.name.trim(),
    specialty: parsed.data.specialty,
  });

  if (error) {
    logger.error("createProfessional failed", error, "professionals.create");
    return { error: `Erro ao criar profissional: ${error.message}` };
  }

  revalidatePath("/professionals");
  return {};
}

export async function updateProfessional(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    id: (formData.get("id") as string) ?? "",
    name: (formData.get("name") as string) ?? "",
    specialty: (formData.get("specialty") as string) ?? "",
    active: formData.get("active") === "true",
  };

  const parsed = updateProfessionalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("professionals")
    .update({
      name: parsed.data.name.trim(),
      specialty: parsed.data.specialty,
      active: parsed.data.active,
    })
    .eq("id", parsed.data.id);

  if (error) {
    logger.error("updateProfessional failed", error, "professionals.update");
    return { error: `Erro ao atualizar profissional: ${error.message}` };
  }

  revalidatePath("/professionals");
  return {};
}

export async function deleteProfessional(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("professionals").delete().eq("id", parsed.data);

  if (error) {
    logger.error("deleteProfessional failed", error, "professionals.delete");
    return { error: `Erro ao excluir profissional: ${error.message}` };
  }

  revalidatePath("/professionals");
  return {};
}
