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

  // Clear detail fields when the corresponding boolean is off
  const has_allergy = boolField("has_allergy");
  const has_heart_disease = boolField("has_heart_disease");
  const has_diabetes = boolField("has_diabetes");
  const has_hypertension = boolField("has_hypertension");
  const has_bleeding_disorder = boolField("has_bleeding_disorder");
  const uses_medication = boolField("uses_medication");

  const payload = {
    patient_id: patientId,
    has_allergy,
    allergy_details: has_allergy ? textField("allergy_details") : "",
    has_heart_disease,
    heart_details: has_heart_disease ? textField("heart_details") : "",
    has_diabetes,
    diabetes_details: has_diabetes ? textField("diabetes_details") : "",
    has_hypertension,
    hypertension_details: has_hypertension ? textField("hypertension_details") : "",
    has_bleeding_disorder,
    bleeding_details: has_bleeding_disorder ? textField("bleeding_details") : "",
    uses_medication,
    medication_details: uses_medication ? textField("medication_details") : "",
    is_pregnant: boolField("is_pregnant"),
    is_smoker: boolField("is_smoker"),
    other_conditions: textField("other_conditions"),
    has_alert: boolField("has_alert"),
    alert_message: textField("alert_message"),
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  // Use upsert to avoid read-then-write race condition
  const { error } = await supabase.from("anamnesis").upsert(
    payload,
    { onConflict: "patient_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/patients/${patientId}`);
}
