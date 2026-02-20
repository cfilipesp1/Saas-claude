import { createServerSupabase } from "@/lib/supabase/server";

// ─── Daily Cash ──────────────────────────────────────────────

export async function getDailyTransactions(date: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("financial_transactions")
    .select("*, patient:patients(id, name), entries:financial_entries(*, category:categories(*), cost_center:cost_centers(*))")
    .eq("transaction_date", date)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Receivables ─────────────────────────────────────────────

export async function getReceivables(status?: string) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("receivables")
    .select("*, patient:patients(id, name)")
    .order("due_date");
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data } = await query;
  return data ?? [];
}

// ─── Payables ────────────────────────────────────────────────

export async function getPayables(status?: string) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("payables")
    .select("*, category:categories(id, name), cost_center:cost_centers(id, name)")
    .order("due_date");
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data } = await query;
  return data ?? [];
}

// ─── Categories & Cost Centers ───────────────────────────────

export async function getCategories(type?: string) {
  const supabase = await createServerSupabase();
  let query = supabase.from("categories").select("*").order("name");
  if (type) {
    query = query.eq("type", type);
  }
  const { data } = await query;
  return data ?? [];
}

export async function getCostCenters() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("cost_centers").select("*").order("name");
  return data ?? [];
}

// ─── Ortho Contracts ─────────────────────────────────────────

export async function getOrthoContracts() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("ortho_contracts")
    .select("*, patient:patients(id, name)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Dashboard ───────────────────────────────────────────────

export async function getFinancialSummary(startDate: string, endDate: string) {
  const supabase = await createServerSupabase();

  const [txResult, recResult, payResult] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("type, total_amount, transaction_date, entries:financial_entries(amount, category:categories(id, name), cost_center:cost_centers(id, name))")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate),
    supabase
      .from("receivables")
      .select("amount, status, due_date, paid_amount")
      .gte("due_date", startDate)
      .lte("due_date", endDate),
    supabase
      .from("payables")
      .select("amount, status, due_date, paid_amount")
      .gte("due_date", startDate)
      .lte("due_date", endDate),
  ]);

  return {
    transactions: txResult.data ?? [],
    receivables: recResult.data ?? [],
    payables: payResult.data ?? [],
  };
}

// ─── Patients (for selects) ─────────────────────────────────

export async function getFinancialPatients() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("patients").select("id, name").order("name");
  return data ?? [];
}
