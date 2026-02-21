"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAppointmentSchema, updateAppointmentSchema, uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { getAppointments as queryAppointments } from "@/queries/appointments";
import type { AppointmentStatus } from "@/lib/types";

export async function fetchAppointments(startDate: string, endDate: string) {
  return queryAppointments(startDate, endDate);
}

export async function createAppointment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raw = {
    patient_id: (formData.get("patient_id") as string) || null,
    professional_id: (formData.get("professional_id") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    start_at: (formData.get("start_at") as string) ?? "",
    end_at: (formData.get("end_at") as string) ?? "",
    notes: (formData.get("notes") as string) ?? "",
    status: "scheduled" as AppointmentStatus,
  };

  const parsed = createAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("appointments")
    .insert({
      patient_id: parsed.data.patient_id || null,
      professional_id: parsed.data.professional_id,
      title: parsed.data.title,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      notes: parsed.data.notes,
      status: parsed.data.status,
      created_by: user?.id ?? null,
    });

  if (error) {
    logger.error("createAppointment failed", error, "appointments.create");
    return { error: `Erro ao criar agendamento: ${error.message}` };
  }

  revalidatePath("/schedule");
  return {};
}

export async function updateAppointment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();

  const raw = {
    id: (formData.get("id") as string) ?? "",
    patient_id: (formData.get("patient_id") as string) || null,
    professional_id: (formData.get("professional_id") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    start_at: (formData.get("start_at") as string) ?? "",
    end_at: (formData.get("end_at") as string) ?? "",
    notes: (formData.get("notes") as string) ?? "",
    status: (formData.get("status") as string) ?? "scheduled",
  };

  const parsed = updateAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      patient_id: parsed.data.patient_id || null,
      professional_id: parsed.data.professional_id,
      title: parsed.data.title,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      notes: parsed.data.notes,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.id);

  if (error) {
    logger.error("updateAppointment failed", error, "appointments.update");
    return { error: `Erro ao atualizar agendamento: ${error.message}` };
  }

  revalidatePath("/schedule");
  return {};
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", parsedId.data);

  if (error) {
    logger.error("updateAppointmentStatus failed", error, "appointments.updateStatus");
    return { error: `Erro ao atualizar status: ${error.message}` };
  }

  revalidatePath("/schedule");
  return {};
}

export async function deleteAppointment(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("appointments").delete().eq("id", parsed.data);

  if (error) {
    logger.error("deleteAppointment failed", error, "appointments.delete");
    return { error: `Erro ao excluir agendamento: ${error.message}` };
  }

  revalidatePath("/schedule");
  return {};
}
