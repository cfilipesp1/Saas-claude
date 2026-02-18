"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  UserRound,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/professionals", label: "Profissionais", icon: Users },
  { href: "/patients", label: "Pacientes", icon: UserRound },
  { href: "/waitlist", label: "Fila de Espera", icon: ClipboardList },
];

export default function Navbar({
  clinicName,
  userName,
}: {
  clinicName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-cyan-700">O+ Dental</h1>
          <p className="text-xs text-slate-500 mt-1 truncate">{clinicName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <l.icon size={18} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2 truncate">{userName}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-cyan-700">O+ Dental</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 w-64 h-full bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h1 className="text-xl font-bold text-cyan-700">O+ Dental</h1>
              <p className="text-xs text-slate-500 mt-1">{clinicName}</p>
            </div>
            <nav className="p-4 space-y-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-cyan-50 text-cyan-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <l.icon size={18} />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">{userName}</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
