"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPatient(id: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getPatients(search?: string) {
  const supabase = await createServerSupabase();
  let query = supabase.from("patients").select("*").order("name");

  if (search) {
    // Sanitize search input: escape PostgREST special chars to prevent query injection
    const sanitized = search.replace(/[%_\\,.()"']/g, "");
    if (sanitized.length > 0) {
      query = query.or(
        `name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function createPatient(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Nome é obrigatório" };
  }

  // Ensure the user's clinic row exists (self-healing if signup trigger failed)
  const { error: clinicError } = await supabase.rpc("ensure_clinic_exists");
  if (clinicError) {
    console.error("ensure_clinic_exists error:", clinicError);
    return { error: "Clínica não encontrada. Tente fazer logout e login novamente." };
  }

  const birthDate = (formData.get("birth_date") as string) || null;

  const { error } = await supabase.from("patients").insert({
    name: name.trim(),
    phone: (formData.get("phone") as string) || "",
    email: (formData.get("email") as string) || "",
    birth_date: birthDate || null,
    address: (formData.get("address") as string) || "",
  });

  if (error) {
    console.error("createPatient error:", error);
    return { error: `Erro ao criar paciente: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/patients");
  return {};
}

export async function updatePatient(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;

  const name = formData.get("name");
  if (!id || !name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "ID e nome são obrigatórios" };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name: name.trim(),
      phone: (formData.get("phone") as string) || "",
      email: (formData.get("email") as string) || "",
      birth_date: (formData.get("birth_date") as string) || null,
      address: (formData.get("address") as string) || "",
    })
    .eq("id", id);

  if (error) {
    console.error("updatePatient error:", error);
    return { error: `Erro ao atualizar paciente: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/patients");
  return {};
}

export async function deletePatient(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("patients").delete().eq("id", id);

  if (error) {
    console.error("deletePatient error:", error);
    return { error: `Erro ao excluir paciente: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/patients");
  return {};
}
