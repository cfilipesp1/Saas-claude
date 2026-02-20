"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOrthoContract,
  cancelOrthoContract,
  settleReceivable,
} from "@/actions/financial";
import { getOrthoReceivables } from "@/queries/financial";
import {
  Plus,
  X,
  Eye,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface ContractRow {
  id: string;
  patient_id: string;
  monthly_amount: number;
  total_months: number;
  due_day: number;
  start_date: string;
  status: string;
  notes: string;
  created_at: string;
  patient?: { id: string; name: string } | null;
}

interface RecRow {
  id: string;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number;
  installment_num: number | null;
  total_installments: number | null;
  description: string;
  patient?: { id: string; name: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  completed: { label: "Concluído", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const REC_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Em Aberto", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700" },
  renegotiated: { label: "Renegociado", color: "bg-slate-100 text-slate-500" },
};

export default function OrthodonticsClient({
  contracts,
  patients,
}: {
  contracts: ContractRow[];
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractRow | null>(null);
  const [receivables, setReceivables] = useState<RecRow[]>([]);
  const [settleModal, setSettleModal] = useState<RecRow | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOrthoContract(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  }

  function handleCancel(id: string) {
    if (!confirm("Cancelar este contrato? As mensalidades em aberto serão canceladas.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelOrthoContract(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDetailContract(null);
      router.refresh();
    });
  }

  function openDetail(contract: ContractRow) {
    setDetailContract(contract);
    startTransition(async () => {
      const recs = await getOrthoReceivables(contract.id);
      setReceivables(
        recs.map((r: RecRow) => {
          if (r.status === "open" && new Date(r.due_date) < new Date()) {
            return { ...r, status: "overdue" };
          }
          return r;
        })
      );
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
      // Refresh receivables
      if (detailContract) {
        const recs = await getOrthoReceivables(detailContract.id);
        setReceivables(
          recs.map((r: RecRow) => {
            if (r.status === "open" && new Date(r.due_date) < new Date()) {
              return { ...r, status: "overdue" };
            }
            return r;
          })
        );
      }
      router.refresh();
    });
  }

  function fmt(v: number) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const paidCount = receivables.filter((r) => r.status === "paid").length;
  const openCount = receivables.filter((r) => r.status === "open" || r.status === "overdue").length;
  const overdueCount = receivables.filter((r) => r.status === "overdue").length;

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

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Contratos de Ortodontia</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Novo Contrato
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Novo Contrato de Ortodontia</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select name="patient_id" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Paciente *</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input name="monthly_amount" type="number" step="0.01" min="0.01" required placeholder="Mensalidade *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="total_months" type="number" min="1" defaultValue="24" placeholder="Total de Meses" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input name="due_day" type="number" min="1" max="28" defaultValue="10" placeholder="Dia Vencimento (1-28)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data de Início *</label>
              <input name="start_date" type="date" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea name="notes" placeholder="Observações" rows={2} className="border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
            <button type="submit" disabled={isPending} className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {isPending ? "Criando contrato e mensalidades..." : "Criar Contrato"}
            </button>
          </form>
        </div>
      )}

      {/* Contracts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.length === 0 ? (
          <p className="text-sm text-slate-400 italic col-span-full text-center py-8">
            Nenhum contrato cadastrado
          </p>
        ) : (
          contracts.map((c) => {
            const st = STATUS_LABELS[c.status] || STATUS_LABELS.active;
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {c.patient?.name || "Paciente"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.total_months} meses · Dia {c.due_day}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-lg font-bold text-cyan-700 mb-1">
                  {fmt(c.monthly_amount)}/mês
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Início: {new Date(c.start_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
                {c.notes && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.notes}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => openDetail(c)}
                    className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    <Eye size={14} />
                    Mensalidades
                  </button>
                  {c.status === "active" && (
                    <button
                      onClick={() => handleCancel(c.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 ml-auto"
                    >
                      <XCircle size={14} />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receivables detail modal */}
      {detailContract && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">
                  Mensalidades — {detailContract.patient?.name}
                </h3>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-green-600 font-medium">
                    Pagas: {paidCount}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    Abertas: {openCount}
                  </span>
                  {overdueCount > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      Vencidas: {overdueCount}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetailContract(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-2">
              {receivables.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  Carregando...
                </p>
              ) : (
                receivables.map((r) => {
                  const st = REC_STATUS[r.status] || REC_STATUS.open;
                  const canPay = r.status === "open" || r.status === "overdue";
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-100 hover:bg-slate-50"
                    >
                      <span className="text-xs text-slate-400 w-16">
                        {r.installment_num}/{r.total_installments}
                      </span>
                      <span className="text-xs text-slate-600 w-24">
                        {new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-sm font-medium text-slate-800 flex-1">
                        {fmt(r.amount)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                        {st.label}
                      </span>
                      {canPay && (
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle modal */}
      {settleModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Receber Mensalidade</h3>
            <p className="text-sm text-slate-500 mb-4">
              Parcela {settleModal.installment_num}/{settleModal.total_installments} — Venc.{" "}
              {new Date(settleModal.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">Valor</label>
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
              <button onClick={() => setSettleModal(null)} className="px-4 py-2 text-sm text-slate-600">
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
    </div>
  );
}
