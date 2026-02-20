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
        `name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,cpf.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPatient(formData: FormData) {
  const supabase = await createServerSupabase();

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Nome é obrigatório");
  }

  const birthDate = (formData.get("birth_date") as string) || null;

  const { error } = await supabase.from("patients").insert({
    name: name.trim(),
    phone: (formData.get("phone") as string) || "",
    email: (formData.get("email") as string) || "",
    cpf: (formData.get("cpf") as string) || "",
    birth_date: birthDate || null,
    notes: (formData.get("notes") as string) || "",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/patients");
}

export async function updatePatient(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;

  const name = formData.get("name");
  if (!id || !name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("ID e nome são obrigatórios");
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name: name.trim(),
      phone: (formData.get("phone") as string) || "",
      email: (formData.get("email") as string) || "",
      cpf: (formData.get("cpf") as string) || "",
      birth_date: (formData.get("birth_date") as string) || null,
      notes: (formData.get("notes") as string) || "",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/patients");
}

export async function deletePatient(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/patients");
}
