import {
  getWaitlistEntries,
  getWaitlistPatients,
  getWaitlistProfessionals,
} from "@/queries/waitlist";
import WaitlistClient from "./WaitlistClient";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const [entries, patients, professionals] = await Promise.all([
    getWaitlistEntries(),
    getWaitlistPatients(),
    getWaitlistProfessionals(),
  ]);

  return (
    <WaitlistClient
      initialEntries={entries}
      patients={patients}
      professionals={professionals}
    />
  );
}
