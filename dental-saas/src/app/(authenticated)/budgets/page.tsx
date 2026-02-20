import { getBudgets, getBudgetPatients } from "@/queries/budgets";
import BudgetsClient from "./BudgetsClient";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const [budgets, patients] = await Promise.all([
    getBudgets(),
    getBudgetPatients(),
  ]);

  return <BudgetsClient budgets={budgets} patients={patients} />;
}
