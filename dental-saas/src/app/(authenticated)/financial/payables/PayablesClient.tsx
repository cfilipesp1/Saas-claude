"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayable, settlePayable, deletePayable } from "@/actions/financial";
import { Plus, X, Trash2, CheckCircle } from "lucide-react";

interface PayRow {
  id: string;
  supplier: string;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number;
  paid_at: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  description: string;
  created_at: string;
  category?: { id: string; name: string } | null;
  cost_center?: { id: string; name: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Em Aberto", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700" },
};

export default function PayablesClient({
  initialData,
  categories,
  costCenters,
  currentStatus,
}: {
  initialData: PayRow[];
  categories: { id: string; name: string }[];
  costCenters: { id: string; name: string }[];
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [settleModal, setSettleModal] = useState<PayRow | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

  const data = initialData.map((p) => {
    if (p.status === "open" && new Date(p.due_date) < new Date()) {
      return { ...p, status: "overdue" };
    }
    return p;
  });

  function filterByStatus(s: string) {
    router.push(`/financial/payables?status=${s}`);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPayable(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  }

  function handleSettle() {
    if (!settleModal) return;
    setError(null);
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Informe um valor válido");
      return;
    }
    startTransition(async () => {
      const result = await settlePayable(settleModal.id, amount);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSettleModal(null);
      setSettleAmount("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir esta conta a pagar?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePayable(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function fmt(v: number) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-slate-800">Contas a Pagar</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Nova Despesa
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { key: "open", label: "Em Aberto" },
          { key: "paid", label: "Pagos" },
          { key: "overdue", label: "Vencidos" },
          { key: "all", label: "Todos" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => filterByStatus(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              currentStatus === f.key
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Nova Conta a Pagar</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="supplier" required placeholder="Fornecedor *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Valor *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Vencimento *</label>
              <input name="due_date" type="date" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <select name="category_id" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Categoria (opcional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="cost_center_id" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Centro de Custo (opcional)</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="description" placeholder="Descrição" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="submit" disabled={isPending} className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Fornecedor</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium hidden sm:table-cell">Categoria</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Vencimento</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Valor</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                  Nenhuma conta encontrada
                </td>
              </tr>
            ) : (
              data.map((p) => {
                const st = STATUS_LABELS[p.status] || STATUS_LABELS.open;
                const canAct = p.status === "open" || p.status === "overdue";
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">
                      {p.supplier || "—"}
                      {p.description && (
                        <p className="text-xs text-slate-400 truncate max-w-48">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                      {p.category?.name || "—"}
                      {p.cost_center && (
                        <span className="text-slate-400 ml-1">· {p.cost_center.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(p.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canAct && (
                          <button
                            onClick={() => {
                              setSettleModal(p);
                              setSettleAmount(String(p.amount - Number(p.paid_amount)));
                            }}
                            className="text-green-600 hover:text-green-700"
                            title="Pagar"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-slate-300 hover:text-red-500"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Settle modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Pagar Conta</h3>
            <p className="text-sm text-slate-600 mb-1">
              {settleModal.supplier} — Venc.{" "}
              {new Date(settleModal.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Total: {fmt(settleModal.amount)}
            </p>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">Valor a Pagar</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSettleModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                Cancelar
              </button>
              <button
                onClick={handleSettle}
                disabled={isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
