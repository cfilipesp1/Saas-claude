import { redirect } from "next/navigation";
import { getProfile, getClinic } from "@/actions/auth";
import Navbar from "@/components/Navbar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=no_profile");

  const clinic = await getClinic();
  const clinicName = clinic?.name ?? "Clínica";

  return (
    <div className="min-h-screen">
      <Navbar clinicName={clinicName} userName={profile.full_name || "Usuário"} />
      <main className="md:ml-64 p-4 md:p-8">{children}</main>
    </div>
  );
}
