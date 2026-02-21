import { createServerSupabase } from "@/lib/supabase/server";
import { Users, UserRound, ClipboardList, DollarSign } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // Mark overdue receivables/payables on every dashboard load
  // This replaces pg_cron (not available on Supabase Free plan)
  await supabase.rpc("mark_overdue_items").then(() => {}, () => {});

  const [
    { count: profCount },
    { count: patCount },
    { count: waitCount },
    { count: recCount },
  ] = await Promise.all([
    supabase.from("professionals").select("*", { count: "exact", head: true }),
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("waitlist_entries")
      .select("*", { count: "exact", head: true })
      .not("status", "in", '("DONE","CANCELLED")'),
    supabase
      .from("receivables")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  const cards = [
    {
      label: "Profissionais",
      value: profCount ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      href: "/professionals",
    },
    {
      label: "Pacientes",
      value: patCount ?? 0,
      icon: UserRound,
      color: "bg-green-50 text-green-600",
      href: "/patients",
    },
    {
      label: "Fila de Espera",
      value: waitCount ?? 0,
      icon: ClipboardList,
      color: "bg-amber-50 text-amber-600",
      href: "/waitlist",
    },
    {
      label: "A Receber",
      value: recCount ?? 0,
      icon: DollarSign,
      color: "bg-cyan-50 text-cyan-600",
      href: "/financial/receivables",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${c.color}`}>
                <c.icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="text-sm text-slate-500">{c.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
