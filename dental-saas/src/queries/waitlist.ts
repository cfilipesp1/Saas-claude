import { createServerSupabase } from "@/lib/supabase/server";

export async function getWaitlistEntries() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("*, patient:patients(*), professional:professionals(*)")
    .order("priority", { ascending: false })
    .order("created_at");
  if (error) return [];
  return data ?? [];
}

export async function getWaitlistPatients() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("patients").select("id, name").order("name");
  return data ?? [];
}

export async function getWaitlistProfessionals() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("professionals")
    .select("id, name, specialty")
    .eq("active", true)
    .order("name");
  return data ?? [];
}
