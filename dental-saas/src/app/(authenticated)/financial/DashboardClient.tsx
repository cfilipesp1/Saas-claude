"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Download,
  Calendar,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  summary: {
    transactions: any[];
    receivables: any[];
    payables: any[];
  };
  startDate: string;
  endDate: string;
}

export default function DashboardClient({ summary, startDate, endDate }: Props) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  // KPI calculations
  const totalIn = summary.transactions
    .filter((t) => t.type === "IN")
    .reduce((s, t) => s + Number(t.total_amount), 0);

  const totalOut = summary.transactions
    .filter((t) => t.type === "OUT")
    .reduce((s, t) => s + Number(t.total_amount), 0);

  const expectedRevenue = summary.receivables.reduce(
    (s, r) => s + Number(r.amount),
    0
  );

  const overdueAmount = summary.receivables
    .filter((r) => r.status === "open" && new Date(r.due_date) < new Date())
    .reduce((s, r) => s + (Number(r.amount) - Number(r.paid_amount)), 0);

  const defaultRate =
    expectedRevenue > 0 ? (overdueAmount / expectedRevenue) * 100 : 0;

  const result = totalIn - totalOut;

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  summary.transactions
    .filter((t) => t.type === "IN")
    .forEach((t) => {
      const d = t.transaction_date;
      revenueByDay[d] = (revenueByDay[d] || 0) + Number(t.total_amount);
    });
  const dayEntries = Object.entries(revenueByDay).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Revenue by category
  const revenueByCategory: Record<string, number> = {};
  summary.transactions
    .filter((t: any) => t.type === "IN")
    .forEach((t: any) => {
      (t.entries ?? []).forEach((e: any) => {
        const cat = e.category?.name ?? (Array.isArray(e.category) ? e.category[0]?.name : null) ?? "Sem categoria";
        revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(e.amount);
      });
    });
  const categoryEntries = Object.entries(revenueByCategory).sort(
    ([, a], [, b]) => b - a
  );

  // Expenses by cost center
  const expByCostCenter: Record<string, number> = {};
  summary.transactions
    .filter((t: any) => t.type === "OUT")
    .forEach((t: any) => {
      (t.entries ?? []).forEach((e: any) => {
        const cc = e.cost_center?.name ?? (Array.isArray(e.cost_center) ? e.cost_center[0]?.name : null) ?? "Sem centro de custo";
        expByCostCenter[cc] = (expByCostCenter[cc] || 0) + Number(e.amount);
      });
    });
  const ccEntries = Object.entries(expByCostCenter).sort(
    ([, a], [, b]) => b - a
  );

  function applyFilter() {
    router.push(`/financial?start=${start}&end=${end}`);
  }

  function fmt(v: number) {
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function exportCSV() {
    const rows = [
      ["Tipo", "Data", "Valor"],
      ...summary.transactions.map((t) => [
        t.type === "IN" ? "Receita" : "Despesa",
        t.transaction_date,
        Number(t.total_amount).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Início</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fim</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={applyFilter}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Calendar size={16} />
          Filtrar
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition ml-auto"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          label="Receita Recebida"
          value={fmt(totalIn)}
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <KPICard
          label="Receita Prevista"
          value={fmt(expectedRevenue)}
          icon={DollarSign}
          color="bg-blue-50 text-blue-600"
        />
        <KPICard
          label="Despesas"
          value={fmt(totalOut)}
          icon={TrendingDown}
          color="bg-red-50 text-red-600"
        />
        <KPICard
          label="Resultado"
          value={fmt(result)}
          icon={DollarSign}
          color={result >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
        />
        <KPICard
          label="Inadimplência"
          value={`${defaultRate.toFixed(1)}%`}
          icon={AlertTriangle}
          color={defaultRate > 20 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Receita por Dia">
          <LineChart data={dayEntries} />
        </ChartCard>
        <ChartCard title="Receita por Categoria">
          <BarChart data={categoryEntries} color="#0891b2" />
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Despesas por Centro de Custo">
          <BarChart data={ccEntries} color="#e11d48" />
        </ChartCard>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function LineChart({ data }: { data: [string, number][] }) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400 italic py-8 text-center">Sem dados no período</p>;
  }

  const W = 500;
  const H = 200;
  const PX = 50;
  const PY = 20;
  const maxVal = Math.max(...data.map(([, v]) => v), 1);

  const points = data.map(([, v], i) => {
    const x = PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2);
    const y = PY + (1 - v / maxVal) * (H - PY * 2);
    return { x, y, v };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = PY + (1 - pct) * (H - PY * 2);
        return (
          <g key={pct}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PX - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
              {(maxVal * pct).toFixed(0)}
            </text>
          </g>
        );
      })}
      {/* Line */}
      <path d={pathD} fill="none" stroke="#0891b2" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0891b2" />
      ))}
      {/* X labels */}
      {data.map(([label], i) => {
        if (data.length > 15 && i % Math.ceil(data.length / 10) !== 0) return null;
        const x = PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2);
        return (
          <text key={i} x={x} y={H - 2} textAnchor="middle" fontSize={9} fill="#94a3b8">
            {label.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

function BarChart({
  data,
  color,
}: {
  data: [string, number][];
  color: string;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400 italic py-8 text-center">Sem dados no período</p>;
  }

  const maxVal = Math.max(...data.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {data.slice(0, 8).map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-32 truncate text-right">{label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(value / maxVal) * 100}%`,
                backgroundColor: color,
                minWidth: value > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="text-xs text-slate-500 w-20 text-right">
            {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      ))}
    </div>
  );
}
