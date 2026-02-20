"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, deleteTransaction } from "@/actions/financial";
import {
  Plus,
  Minus,
  X,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { PaymentMethod } from "@/lib/types";

interface EntryRow {
  amount: number;
  category?: { id: string; name: string } | null;
  cost_center?: { id: string; name: string } | null;
}

interface TxRow {
  id: string;
  type: string;
  total_amount: number;
  payment_method: string;
  transaction_date: string;
  description: string;
  created_at: string;
  patient?: { id: string; name: string } | null;
  entries?: EntryRow[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  pix: "PIX",
  bank_transfer: "Transferência",
  check: "Cheque",
  other: "Outro",
};

export default function DailyClient({
  initialDate,
  transactions,
  categories,
  costCenters,
  patients,
}: {
  initialDate: string;
  transactions: TxRow[];
  categories: { id: string; name: string; type: string }[];
  costCenters: { id: string; name: string }[];
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate);
  const [modal, setModal] = useState<"IN" | "OUT" | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  // Rateio state
  const [rateioEntries, setRateioEntries] = useState([
    { category_id: "", cost_center_id: "", amount: "" },
  ]);

  const totalIn = transactions
    .filter((t) => t.type === "IN")
    .reduce((s, t) => s + Number(t.total_amount), 0);
  const totalOut = transactions
    .filter((t) => t.type === "OUT")
    .reduce((s, t) => s + Number(t.total_amount), 0);
  const balance = totalIn - totalOut;

  function changeDate(newDate: string) {
    setDate(newDate);
    router.push(`/financial/daily?date=${newDate}`);
  }

  function openModal(type: "IN" | "OUT") {
    setModal(type);
    setRateioEntries([{ category_id: "", cost_center_id: "", amount: "" }]);
    setError(null);
  }

  function addRateioLine() {
    setRateioEntries([...rateioEntries, { category_id: "", cost_center_id: "", amount: "" }]);
  }

  function removeRateioLine(idx: number) {
    setRateioEntries(rateioEntries.filter((_, i) => i !== idx));
  }

  function updateRateio(idx: number, field: string, value: string) {
    const updated = [...rateioEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setRateioEntries(updated);
  }

  function handleSave(formData: FormData) {
    setError(null);

    // Build entries JSON
    const entries = rateioEntries
      .filter((e) => e.amount && parseFloat(e.amount) > 0)
      .map((e) => ({
        category_id: e.category_id || null,
        cost_center_id: e.cost_center_id || null,
        amount: parseFloat(e.amount),
      }));

    formData.set("entries", JSON.stringify(entries));
    formData.set("type", modal!);
    formData.set("transaction_date", date);

    startTransition(async () => {
      const result = await createTransaction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setModal(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const filteredCategories = categories.filter(
    (c) => c.type === modal
  );

  function fmt(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">Caixa do Dia</h2>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal("IN")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Recebimento
          </button>
          <button
            onClick={() => openModal("OUT")}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Minus size={16} />
            Despesa
          </button>
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xs text-green-600 font-medium">Entradas</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalIn)}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-xs text-red-600 font-medium">Saídas</p>
          <p className="text-lg font-bold text-red-700">{fmt(totalOut)}</p>
        </div>
        <div
          className={`rounded-xl border p-4 text-center ${
            balance >= 0
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p className="text-xs text-slate-600 font-medium">Saldo</p>
          <p
            className={`text-lg font-bold ${
              balance >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 italic p-6 text-center">
            Nenhuma transação nesta data
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id}>
                <div
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    setExpandedTx(expandedTx === tx.id ? null : tx.id)
                  }
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      tx.type === "IN" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.description || (tx.type === "IN" ? "Recebimento" : "Despesa")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {tx.patient?.name && `${tx.patient.name} · `}
                      {PAYMENT_LABELS[tx.payment_method] || tx.payment_method}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      tx.type === "IN" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.type === "IN" ? "+" : "-"} {fmt(Number(tx.total_amount))}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tx.id);
                    }}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedTx === tx.id ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </div>
                {expandedTx === tx.id && tx.entries && tx.entries.length > 0 && (
                  <div className="px-8 pb-3 space-y-1">
                    {tx.entries.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-xs text-slate-500"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>{e.category?.name || "Sem categoria"}</span>
                        {e.cost_center && (
                          <span className="text-slate-400">
                            · {e.cost_center.name}
                          </span>
                        )}
                        <span className="ml-auto font-medium">
                          {fmt(Number(e.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                {modal === "IN" ? "Novo Recebimento" : "Nova Despesa"}
              </h3>
              <button onClick={() => setModal(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <form action={handleSave} className="space-y-4">
              {modal === "IN" && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Paciente
                  </label>
                  <select
                    name="patient_id"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Selecione (opcional)</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Valor Total *
                  </label>
                  <input
                    name="total_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    name="payment_method"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Descrição
                </label>
                <input
                  name="description"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Descrição da transação"
                />
              </div>

              {/* Rateio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-600 font-medium">
                    Rateio
                  </label>
                  <button
                    type="button"
                    onClick={addRateioLine}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    + Linha
                  </button>
                </div>
                <div className="space-y-2">
                  {rateioEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <select
                        value={entry.category_id}
                        onChange={(e) =>
                          updateRateio(idx, "category_id", e.target.value)
                        }
                        className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                      >
                        <option value="">Categoria</option>
                        {filteredCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={entry.cost_center_id}
                        onChange={(e) =>
                          updateRateio(idx, "cost_center_id", e.target.value)
                        }
                        className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                      >
                        <option value="">Centro Custo</option>
                        {costCenters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Valor"
                        value={entry.amount}
                        onChange={(e) =>
                          updateRateio(idx, "amount", e.target.value)
                        }
                        className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                      {rateioEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRateioLine(idx)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={`w-full py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 text-white ${
                  modal === "IN"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
