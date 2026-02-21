"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createPatientSchema, updatePatientSchema, uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function getPatient(id: string) {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return null;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", parsed.data)
    .single();
  if (error) return null;
  return data;
}

export async function getPatients(search?: string) {
  const supabase = await createServerSupabase();
  let query = supabase.from("patients").select("*").order("name");

  if (search) {
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

  const raw = {
    name: (formData.get("name") as string) ?? "",
    codigo: (formData.get("codigo") as string) ?? "",
    phone: (formData.get("phone") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    birth_date: (formData.get("birth_date") as string) || null,
    address: (formData.get("address") as string) ?? "",
    responsavel_clinico_id: (formData.get("responsavel_clinico_id") as string) ?? "",
    responsavel_orto_id: (formData.get("responsavel_orto_id") as string) ?? "",
  };

  const parsed = createPatientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error: clinicError } = await supabase.rpc("ensure_clinic_exists");
  if (clinicError) {
    logger.error("ensure_clinic_exists failed", clinicError, "patients.create");
    return { error: "Clínica não encontrada. Tente fazer logout e login novamente." };
  }

  const { error } = await supabase.from("patients").insert({
    name: parsed.data.name.trim(),
    codigo: parsed.data.codigo,
    phone: parsed.data.phone,
    email: parsed.data.email,
    birth_date: parsed.data.birth_date || null,
    address: parsed.data.address,
    responsavel_clinico_id: parsed.data.responsavel_clinico_id,
    responsavel_orto_id: parsed.data.responsavel_orto_id,
  });

  if (error) {
    logger.error("createPatient failed", error, "patients.create");
    return { error: `Erro ao criar paciente: ${error.message}` };
  }

  revalidatePath("/patients");
  return {};
}

export async function updatePatient(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    id: (formData.get("id") as string) ?? "",
    name: (formData.get("name") as string) ?? "",
    codigo: (formData.get("codigo") as string) ?? "",
    phone: (formData.get("phone") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    birth_date: (formData.get("birth_date") as string) || null,
    address: (formData.get("address") as string) ?? "",
    responsavel_clinico_id: (formData.get("responsavel_clinico_id") as string) ?? "",
    responsavel_orto_id: (formData.get("responsavel_orto_id") as string) ?? "",
  };

  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name: parsed.data.name.trim(),
      codigo: parsed.data.codigo,
      phone: parsed.data.phone,
      email: parsed.data.email,
      birth_date: parsed.data.birth_date || null,
      address: parsed.data.address,
      responsavel_clinico_id: parsed.data.responsavel_clinico_id,
      responsavel_orto_id: parsed.data.responsavel_orto_id,
    })
    .eq("id", parsed.data.id);

  if (error) {
    logger.error("updatePatient failed", error, "patients.update");
    return { error: `Erro ao atualizar paciente: ${error.message}` };
  }

  revalidatePath("/patients");
  return {};
}

export async function deletePatient(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("patients").delete().eq("id", parsed.data);

  if (error) {
    logger.error("deletePatient failed", error, "patients.delete");
    return { error: `Erro ao excluir paciente: ${error.message}` };
  }

  revalidatePath("/patients");
  return {};
}
