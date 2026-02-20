import { getPatients } from "@/actions/patients";
import PatientsClient from "./PatientsClient";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const patients = await getPatients(q);
  return <PatientsClient initialData={patients} initialSearch={q || ""} />;
}
