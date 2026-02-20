import { getCategories, getCostCenters } from "@/queries/financial";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function FinancialSettingsPage() {
  const [categories, costCenters] = await Promise.all([
    getCategories(),
    getCostCenters(),
  ]);

  return <SettingsClient categories={categories} costCenters={costCenters} />;
}
