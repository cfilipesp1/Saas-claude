import { createServerSupabase } from "@/lib/supabase/server";

export async function getBudgets(status?: string) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("budgets")
    .select("*, patient:patients(id, name, phone, birth_date)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data } = await query;
  return data ?? [];
}

export async function getBudgetPatients() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("patients")
    .select("id, name, phone, birth_date")
    .order("name");
  return data ?? [];
}
