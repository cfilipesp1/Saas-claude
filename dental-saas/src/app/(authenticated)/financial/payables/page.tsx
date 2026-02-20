import { getPayables, getCategories, getCostCenters } from "@/queries/financial";
import PayablesClient from "./PayablesClient";

export const dynamic = "force-dynamic";

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "open";

  const [payables, categories, costCenters] = await Promise.all([
    getPayables(status),
    getCategories("OUT"),
    getCostCenters(),
  ]);

  return (
    <PayablesClient
      initialData={payables}
      categories={categories}
      costCenters={costCenters}
      currentStatus={status}
    />
  );
}
