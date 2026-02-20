"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WaitlistStatus } from "@/lib/types";

export async function createWaitlistEntry(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patient_id = formData.get("patient_id") as string;
  if (!patient_id) return { error: "Paciente é obrigatório" };

  const specialty = (formData.get("specialty") as string) || "";
  const preferred_professional_id =
    (formData.get("preferred_professional_id") as string) || null;
  const priority = parseInt((formData.get("priority") as string) || "0", 10);
  const notes = (formData.get("notes") as string) || "";

  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      patient_id,
      specialty,
      preferred_professional_id: preferred_professional_id || null,
      priority,
      notes,
      status: "NEW" as WaitlistStatus,
    })
    .select()
    .single();

  if (error) {
    console.error("createWaitlistEntry error:", error);
    return { error: `Erro ao adicionar à fila: ${error.message} (code: ${error.code})` };
  }

  // Create initial event (best-effort: don't fail the whole operation if event logging fails)
  const { error: eventError } = await supabase.from("waitlist_events").insert({
    waitlist_entry_id: entry.id,
    from_status: null,
    to_status: "NEW",
    actor_user_id: user?.id ?? null,
    note: "Paciente adicionado à fila",
  });

  if (eventError) {
    console.error("Failed to create initial waitlist event:", eventError.message);
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
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: toStatus })
    .eq("id", entryId)
    .eq("status", fromStatus); // Optimistic lock: only update if status hasn't changed

  if (error) {
    console.error("updateWaitlistStatus error:", error);
    return { error: `Erro ao atualizar status: ${error.message} (code: ${error.code})` };
  }

  // Create status change event (best-effort)
  const { error: eventError } = await supabase.from("waitlist_events").insert({
    waitlist_entry_id: entryId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_user_id: user?.id ?? null,
    note: note || `Status alterado de ${fromStatus} para ${toStatus}`,
  });

  if (eventError) {
    console.error("Failed to create waitlist status event:", eventError.message);
  }

  revalidatePath("/waitlist");
  return {};
}

export async function getWaitlistEvents(entryId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("waitlist_events")
    .select("*")
    .eq("waitlist_entry_id", entryId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function deleteWaitlistEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);

  if (error) {
    console.error("deleteWaitlistEntry error:", error);
    return { error: `Erro ao remover da fila: ${error.message} (code: ${error.code})` };
  }

  revalidatePath("/waitlist");
  return {};
}
