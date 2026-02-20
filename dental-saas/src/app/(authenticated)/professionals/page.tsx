import { getProfessionals } from "@/actions/professionals";
import ProfessionalsClient from "./ProfessionalsClient";

export default async function ProfessionalsPage() {
  const professionals = await getProfessionals();
  return <ProfessionalsClient initialData={professionals} />;
}
