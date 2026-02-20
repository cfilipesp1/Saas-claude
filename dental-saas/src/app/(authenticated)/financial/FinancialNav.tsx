"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/financial", label: "Dashboard" },
  { href: "/financial/daily", label: "Caixa" },
  { href: "/financial/receivables", label: "A Receber" },
  { href: "/financial/payables", label: "A Pagar" },
  { href: "/financial/orthodontics", label: "Ortodontia" },
  { href: "/financial/settings", label: "Configurações" },
];

export default function FinancialNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/financial") return pathname === "/financial";
    return pathname.startsWith(href);
  }

  return (
    <div className="border-b border-slate-200 mb-6 -mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto">
      <nav className="flex gap-1 min-w-max" aria-label="Navegação financeira">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
