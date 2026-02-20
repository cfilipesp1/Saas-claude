"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfessionals() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("professionals")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProfessional(formData: FormData) {
  const supabase = await createServerSupabase();
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Nome é obrigatório");
  }
  const specialty = formData.get("specialty") as string;

  const { error } = await supabase.from("professionals").insert({
    name: name.trim(),
    specialty: specialty || "",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/professionals");
}

export async function updateProfessional(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;
  const name = formData.get("name");
  if (!id || !name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("ID e nome são obrigatórios");
  }
  const specialty = formData.get("specialty") as string;
  const active = formData.get("active") === "true";

  const { error } = await supabase
    .from("professionals")
    .update({ name: name.trim(), specialty, active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/professionals");
}

export async function deleteProfessional(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("professionals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/professionals");
}
