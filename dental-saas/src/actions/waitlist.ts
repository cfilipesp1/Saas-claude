"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createWaitlistEntrySchema, uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import type { WaitlistStatus } from "@/lib/types";

export async function createWaitlistEntry(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raw = {
    patient_id: (formData.get("patient_id") as string) ?? "",
    specialty: (formData.get("specialty") as string) ?? "",
    preferred_professional_id: (formData.get("preferred_professional_id") as string) || null,
    priority: parseInt((formData.get("priority") as string) || "0", 10),
    notes: (formData.get("notes") as string) ?? "",
  };

  const parsed = createWaitlistEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      patient_id: parsed.data.patient_id,
      specialty: parsed.data.specialty,
      preferred_professional_id: parsed.data.preferred_professional_id || null,
      priority: parsed.data.priority,
      notes: parsed.data.notes,
      status: "NEW" as WaitlistStatus,
    })
    .select()
    .single();

  if (error) {
    logger.error("createWaitlistEntry failed", error, "waitlist.create");
    return { error: `Erro ao adicionar à fila: ${error.message}` };
  }

  const { error: eventError } = await supabase.from("waitlist_events").insert({
    waitlist_entry_id: entry.id,
    from_status: null,
    to_status: "NEW",
    actor_user_id: user?.id ?? null,
    note: "Paciente adicionado à fila",
  });

  if (eventError) {
    logger.error("Failed to create initial waitlist event", eventError, "waitlist.create");
  }

  revalidatePath("/waitlist");
  return {};
}

export async function updateWaitlistStatus(
  entryId: string,
  fromStatus: WaitlistStatus,
  toStatus: WaitlistStatus,
  note: string
): Promise<{ error?: string }> {
  const parsedId = uuidSchema.safeParse(entryId);
  if (!parsedId.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: toStatus })
    .eq("id", parsedId.data)
    .eq("status", fromStatus);

  if (error) {
    logger.error("updateWaitlistStatus failed", error, "waitlist.updateStatus");
    return { error: `Erro ao atualizar status: ${error.message}` };
  }

  const { error: eventError } = await supabase.from("waitlist_events").insert({
    waitlist_entry_id: parsedId.data,
    from_status: fromStatus,
    to_status: toStatus,
    actor_user_id: user?.id ?? null,
    note: note || `Status alterado de ${fromStatus} para ${toStatus}`,
  });

  if (eventError) {
    logger.error("Failed to create waitlist status event", eventError, "waitlist.updateStatus");
  }

  revalidatePath("/waitlist");
  return {};
}

export async function getWaitlistEvents(entryId: string) {
  const parsedId = uuidSchema.safeParse(entryId);
  if (!parsedId.success) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("waitlist_events")
    .select("*")
    .eq("waitlist_entry_id", parsedId.data)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function deleteWaitlistEntry(id: string): Promise<{ error?: string }> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("waitlist_entries").delete().eq("id", parsed.data);

  if (error) {
    logger.error("deleteWaitlistEntry failed", error, "waitlist.delete");
    return { error: `Erro ao remover da fila: ${error.message}` };
  }

  revalidatePath("/waitlist");
  return {};
}
