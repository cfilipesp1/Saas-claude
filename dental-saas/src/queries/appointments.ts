import { createServerSupabase } from "@/lib/supabase/server";

export async function getAppointments(startDate: string, endDate: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(id, name), professional:professionals(id, name, specialty)")
    .gte("start_at", startDate)
    .lte("start_at", endDate)
    .order("start_at");
  if (error) return [];
  return data ?? [];
}

export async function getAppointmentPatients() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("patients").select("id, name").order("name");
  return data ?? [];
}

export async function getAppointmentProfessionals() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("professionals")
    .select("id, name, specialty")
    .eq("active", true)
    .order("name");
  return data ?? [];
}
