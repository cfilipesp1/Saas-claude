import { getOrthoContracts, getFinancialPatients } from "@/queries/financial";
import OrthodonticsClient from "./OrthodonticsClient";

export const dynamic = "force-dynamic";

export default async function OrthodonticsPage() {
  const [contracts, patients] = await Promise.all([
    getOrthoContracts(),
    getFinancialPatients(),
  ]);

  return <OrthodonticsClient contracts={contracts} patients={patients} />;
}
