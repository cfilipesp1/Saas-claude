"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAnamnesis(patientId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("anamnesis")
    .select("*")
    .eq("patient_id", patientId)
    .single();
  return data;
}

export async function upsertAnamnesis(patientId: string, formData: FormData) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const boolField = (name: string) => formData.get(name) === "on";
  const textField = (name: string) => (formData.get(name) as string) || "";

  const payload = {
    patient_id: patientId,
    has_allergy: boolField("has_allergy"),
    allergy_details: textField("allergy_details"),
    has_heart_disease: boolField("has_heart_disease"),
    heart_details: textField("heart_details"),
    has_diabetes: boolField("has_diabetes"),
    diabetes_details: textField("diabetes_details"),
    has_hypertension: boolField("has_hypertension"),
    hypertension_details: textField("hypertension_details"),
    has_bleeding_disorder: boolField("has_bleeding_disorder"),
    bleeding_details: textField("bleeding_details"),
    uses_medication: boolField("uses_medication"),
    medication_details: textField("medication_details"),
    is_pregnant: boolField("is_pregnant"),
    is_smoker: boolField("is_smoker"),
    other_conditions: textField("other_conditions"),
    has_alert: boolField("has_alert"),
    alert_message: textField("alert_message"),
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  // Check if anamnesis already exists
  const { data: existing } = await supabase
    .from("anamnesis")
    .select("id")
    .eq("patient_id", patientId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("anamnesis")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("anamnesis").insert({
      ...payload,
      clinic_id: "00000000-0000-0000-0000-000000000000", // overwritten by trigger
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/patients/${patientId}`);
}
