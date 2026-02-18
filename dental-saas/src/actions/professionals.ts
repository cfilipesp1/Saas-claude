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
  const name = formData.get("name") as string;
  const specialty = formData.get("specialty") as string;

  // clinic_id is set automatically by the trigger — send a placeholder that gets overwritten
  const { error } = await supabase.from("professionals").insert({
    name,
    specialty: specialty || "",
    clinic_id: "00000000-0000-0000-0000-000000000000", // overwritten by trigger
  });

  if (error) throw new Error(error.message);
  revalidatePath("/professionals");
}

export async function updateProfessional(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const specialty = formData.get("specialty") as string;
  const active = formData.get("active") === "true";

  const { error } = await supabase
    .from("professionals")
    .update({ name, specialty, active })
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
