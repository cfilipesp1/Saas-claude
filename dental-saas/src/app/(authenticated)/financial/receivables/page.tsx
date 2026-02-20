import { getReceivables, getFinancialPatients } from "@/queries/financial";
import ReceivablesClient from "./ReceivablesClient";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "open";

  const [receivables, patients] = await Promise.all([
    getReceivables(status),
    getFinancialPatients(),
  ]);

  return (
    <ReceivablesClient
      initialData={receivables}
      patients={patients}
      currentStatus={status}
    />
  );
}
