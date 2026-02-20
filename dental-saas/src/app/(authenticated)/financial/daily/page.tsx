import { getDailyTransactions, getCategories, getCostCenters, getFinancialPatients } from "@/queries/financial";
import DailyClient from "./DailyClient";

export const dynamic = "force-dynamic";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date || new Date().toISOString().split("T")[0];

  const [transactions, categories, costCenters, patients] = await Promise.all([
    getDailyTransactions(date),
    getCategories(),
    getCostCenters(),
    getFinancialPatients(),
  ]);

  return (
    <DailyClient
      initialDate={date}
      transactions={transactions}
      categories={categories}
      costCenters={costCenters}
      patients={patients}
    />
  );
}
