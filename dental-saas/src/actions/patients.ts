"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPatients(search?: string) {
  const supabase = await createServerSupabase();
  let query = supabase.from("patients").select("*").order("name");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPatient(formData: FormData) {
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("patients").insert({
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || "",
    email: (formData.get("email") as string) || "",
    cpf: (formData.get("cpf") as string) || "",
    birth_date: (formData.get("birth_date") as string) || null,
    notes: (formData.get("notes") as string) || "",
    clinic_id: "00000000-0000-0000-0000-000000000000", // overwritten by trigger
  });

  if (error) throw new Error(error.message);
  revalidatePath("/patients");
}

export async function updatePatient(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("patients")
    .update({
      name: formData.get("name") as string,
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
