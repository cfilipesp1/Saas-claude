"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createReceivable,
  createInstallmentPlan,
  settleReceivable,
  renegotiateReceivables,
  deleteReceivable,
} from "@/actions/financial";
import { Plus, X, Trash2, CheckCircle, RefreshCw } from "lucide-react";

interface RecRow {
  id: string;
  patient_id: string | null;
  origin_type: string;
  installment_num: number | null;
  total_installments: number | null;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number;
  paid_at: string | null;
  description: string;
  created_at: string;
  patient?: { id: string; name: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Em Aberto", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700" },
  renegotiated: { label: "Renegociado", color: "bg-slate-100 text-slate-500" },
};

export default function ReceivablesClient({
  initialData,
  patients,
  currentStatus,
}: {
  initialData: RecRow[];
  patients: { id: string; name: string }[];
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showInstallment, setShowInstallment] = useState(false);
  const [settleModal, setSettleModal] = useState<RecRow | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [renegModal, setRenegModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renegInstallments, setRenegInstallments] = useState("3");
  const [renegDate, setRenegDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Mark overdue items
  const data = initialData.map((r) => {
    if (r.status === "open" && new Date(r.due_date) < new Date()) {
      return { ...r, status: "overdue" };
    }
    return r;
  });

  function filterByStatus(s: string) {
    router.push(`/financial/receivables?status=${s}`);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createReceivable(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  }

  function handleInstallment(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createInstallmentPlan(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowInstallment(false);
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
      const result = await settleReceivable(settleModal.id, amount);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSettleModal(null);
      setSettleAmount("");
      router.refresh();
    });
  }

  function handleRenegotiate() {
    setError(null);
    const ids = Array.from(selectedIds);
    const num = parseInt(renegInstallments, 10);
    if (ids.length === 0 || isNaN(num) || num < 2 || !renegDate) {
      setError("Selecione contas e preencha os campos");
      return;
    }
    startTransition(async () => {
      const result = await renegotiateReceivables(ids, num, renegDate);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRenegModal(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir esta conta a receber?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteReceivable(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function fmt(v: number) {
    return Number(v).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-slate-800">Contas a Receber</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setShowInstallment(false);
            }}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Avulso
          </button>
          <button
            onClick={() => {
              setShowInstallment(true);
              setShowForm(false);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Parcelamento
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setRenegModal(true)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <RefreshCw size={16} />
              Renegociar ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { key: "open", label: "Em Aberto" },
          { key: "paid", label: "Pagos" },
          { key: "overdue", label: "Vencidos" },
          { key: "renegotiated", label: "Renegociados" },
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

      {/* Single receivable form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Nova Conta a Receber</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select name="patient_id" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Paciente (opcional)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Valor *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="due_date" type="date" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="description" placeholder="Descrição" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="submit" disabled={isPending} className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

      {/* Installment plan form */}
      {showInstallment && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Novo Parcelamento</h3>
            <button onClick={() => setShowInstallment(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleInstallment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select name="patient_id" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Paciente (opcional)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input name="total_amount" type="number" step="0.01" min="0.01" required placeholder="Valor Total *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="num_installments" type="number" min="2" required placeholder="Nº Parcelas *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">1º Vencimento *</label>
              <input name="first_due_date" type="date" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input name="description" placeholder="Descrição" className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="submit" disabled={isPending} className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {isPending ? "Criando parcelas..." : "Criar Parcelamento"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={data.length > 0 && selectedIds.size === data.filter((d) => d.status === "open" || d.status === "overdue").length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(data.filter((d) => d.status === "open" || d.status === "overdue").map((d) => d.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Paciente</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium hidden sm:table-cell">Descrição</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Vencimento</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Valor</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right hidden sm:table-cell">Pago</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                  Nenhuma conta encontrada
                </td>
              </tr>
            ) : (
              data.map((r) => {
                const st = STATUS_LABELS[r.status] || STATUS_LABELS.open;
                const canAct = r.status === "open" || r.status === "overdue";
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {canAct && (
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {r.patient?.name || "—"}
                      {r.installment_num && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({r.installment_num}/{r.total_installments})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell truncate max-w-48">
                      {r.description}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {fmt(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs hidden sm:table-cell">
                      {Number(r.paid_amount) > 0 ? fmt(r.paid_amount) : "—"}
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
                              setSettleModal(r);
                              setSettleAmount(String(r.amount - Number(r.paid_amount)));
                            }}
                            className="text-green-600 hover:text-green-700"
                            title="Dar baixa"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(r.id)}
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
            <h3 className="font-semibold text-slate-800 mb-4">Dar Baixa</h3>
            <p className="text-sm text-slate-600 mb-1">
              {settleModal.patient?.name} — Venc.{" "}
              {new Date(settleModal.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Total: {fmt(settleModal.amount)} · Pago: {fmt(Number(settleModal.paid_amount))}
            </p>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">
                Valor a Receber
              </label>
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
              <button
                onClick={() => setSettleModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSettle}
                disabled={isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renegotiate modal */}
      {renegModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Renegociar</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedIds.size} conta(s) selecionada(s) serão canceladas e
              substituídas por novas parcelas.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Nº Novas Parcelas
                </label>
                <input
                  type="number"
                  min="2"
                  value={renegInstallments}
                  onChange={(e) => setRenegInstallments(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  1º Vencimento
                </label>
                <input
                  type="date"
                  value={renegDate}
                  onChange={(e) => setRenegDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRenegModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenegotiate}
                disabled={isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {isPending ? "Processando..." : "Renegociar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
