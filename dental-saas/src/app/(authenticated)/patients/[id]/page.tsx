import { notFound } from "next/navigation";
import { getPatient } from "@/actions/patients";
import { getAnamnesis } from "@/actions/anamnesis";
import PatientDetailClient from "./PatientDetailClient";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const anamnesis = await getAnamnesis(id);

  return (
    <PatientDetailClient patient={patient} anamnesis={anamnesis} />
  );
}
