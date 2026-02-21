import { redirect } from "next/navigation";
import { getProfileWithClinic } from "@/actions/auth";
import Navbar from "@/components/Navbar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfileWithClinic();
  if (!result) redirect("/login?error=no_profile");

  const { profile, clinic } = result;
  const clinicName = clinic?.name ?? "Clínica";

  return (
    <div className="min-h-screen">
      <Navbar clinicName={clinicName} userName={profile.full_name || "Usuário"} />
      <main className="md:ml-64 p-4 md:p-8">{children}</main>
    </div>
  );
}
