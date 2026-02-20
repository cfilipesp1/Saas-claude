import { getFinancialSummary } from "@/queries/financial";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function FinancialDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const start = params.start || startOfMonth;
  const end = params.end || endOfMonth;

  const summary = await getFinancialSummary(start, end);

  return <DashboardClient summary={summary} startDate={start} endDate={end} />;
}
