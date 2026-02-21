import {
  getAppointments,
  getAppointmentPatients,
  getAppointmentProfessionals,
} from "@/queries/appointments";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  // Load current month range by default
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [appointments, patients, professionals] = await Promise.all([
    getAppointments(startDate, endDate),
    getAppointmentPatients(),
    getAppointmentProfessionals(),
  ]);

  return (
    <ScheduleClient
      initialAppointments={appointments}
      patients={patients}
      professionals={professionals}
    />
  );
}
