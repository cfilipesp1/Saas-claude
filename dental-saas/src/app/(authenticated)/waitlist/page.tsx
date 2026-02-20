import {
  getWaitlistEntries,
  getWaitlistPatients,
  getWaitlistProfessionals,
} from "@/actions/waitlist";
import WaitlistClient from "./WaitlistClient";

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
