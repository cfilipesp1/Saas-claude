"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  INSTALLMENTS,
  CASH_DISCOUNT,
  MANDATORY_UPSELLS,
  OPTIONAL_UPSELLS,
  type OrthoModel,
} from "./constants";

interface PatientInfo {
  id: string;
  name: string;
  phone: string;
  birth_date: string | null;
}

interface Selection {
  model: OrthoModel;
  mandatoryUpsellId: string;
  mandatoryDelta: number;
  optionalUpsellIds: string[];
  monthlyFinal: number;
  total: number;
  cashValue: number;
}

interface BudgetResult {
  patient_id: string | null;
  type: string;
  ortho_type: string;
  model: string;
  monthly_value: number;
  installments: number;
  total: number;
  cash_value: number;
  upsells: { id: string; title: string; type: string; monthlyDelta: number; oneTimeDelta: number }[];
  items: { id: string; procedure: string; benefit: string; entry: number; qty: number; total: number; totalCash: number }[];
  due_day: number | null;
  is_cash: boolean;
  is_plan_complement: boolean;
  notes: string;
  status: string;
}

export default function BudgetSummaryStep({
  orthoType,
  selection,
  patients,
  onApprove,
  onCancel,
  onBack,
  isPending,
}: {
  orthoType: "TRADICIONAL" | "INVISALIGN";
  selection: Selection;
  patients: PatientInfo[];
  onApprove: (data: BudgetResult) => void;
  onCancel: () => void;
  onBack: () => void;
  isPending: boolean;
}) {
  const [patientId, setPatientId] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [isCash, setIsCash] = useState(false);
  const [isPlanComplement, setIsPlanComplement] = useState(false);
  const [notes, setNotes] = useState("");

  const patient = patients.find((p) => p.id === patientId);
  const today = new Date().toLocaleDateString("pt-BR");

  // Build items table
  const items: BudgetResult["items"] = [];
  let itemId = 1;

  // Main model
  items.push({
    id: String(itemId++),
    procedure: `Ortodontia — ${selection.model.name}`,
    benefit: selection.model.benefits.join(", "),
    entry: 0,
    qty: INSTALLMENTS,
    total: Math.round(selection.model.monthlyBase * INSTALLMENTS * 100) / 100,
    totalCash: Math.round(selection.model.monthlyBase * INSTALLMENTS * (1 - CASH_DISCOUNT) * 100) / 100,
  });

  // Mandatory upsell
  const mandUpsell = MANDATORY_UPSELLS.find((u) => u.id === selection.mandatoryUpsellId);
  if (mandUpsell) {
    items.push({
      id: String(itemId++),
      procedure: mandUpsell.title,
      benefit: "Pacote obrigatório",
      entry: 0,
      qty: INSTALLMENTS,
      total: Math.round(mandUpsell.monthlyDelta * INSTALLMENTS * 100) / 100,
      totalCash: Math.round(mandUpsell.monthlyDelta * INSTALLMENTS * (1 - CASH_DISCOUNT) * 100) / 100,
    });
  }

  // Optional upsells
  selection.optionalUpsellIds.forEach((uid) => {
    const opt = OPTIONAL_UPSELLS.find((u) => u.id === uid);
    if (opt) {
      const monthlyTotal = opt.monthlyDelta * INSTALLMENTS;
      items.push({
        id: String(itemId++),
        procedure: opt.title,
        benefit: "Pacote opcional",
        entry: opt.oneTimeDelta,
        qty: INSTALLMENTS,
        total: Math.round((monthlyTotal + opt.oneTimeDelta) * 100) / 100,
        totalCash: Math.round((monthlyTotal + opt.oneTimeDelta) * (1 - CASH_DISCOUNT) * 100) / 100,
      });
    }
  });

  // Build upsells array for saving
  const upsellsData: BudgetResult["upsells"] = [];
  if (mandUpsell) {
    upsellsData.push({
      id: mandUpsell.id,
      title: mandUpsell.title,
      type: "mandatory",
      monthlyDelta: mandUpsell.monthlyDelta,
      oneTimeDelta: 0,
    });
  }
  selection.optionalUpsellIds.forEach((uid) => {
    const opt = OPTIONAL_UPSELLS.find((u) => u.id === uid);
    if (opt) {
      upsellsData.push({
        id: opt.id,
        title: opt.title,
        type: "optional",
        monthlyDelta: opt.monthlyDelta,
        oneTimeDelta: opt.oneTimeDelta,
      });
    }
  });

  const displayTotal = isCash ? selection.cashValue : selection.total;
  const displayMonthly = isCash ? selection.cashValue : selection.monthlyFinal;

  function handleApprove() {
    onApprove({
      patient_id: patientId || null,
      type: "ORTHO",
      ortho_type: orthoType,
      model: selection.model.name,
      monthly_value: selection.monthlyFinal,
      installments: INSTALLMENTS,
      total: selection.total,
      cash_value: selection.cashValue,
      upsells: upsellsData,
      items,
      due_day: dueDay ? parseInt(dueDay, 10) : null,
      is_cash: isCash,
      is_plan_complement: isPlanComplement,
      notes,
      status: "approved",
    });
  }

  function fmt(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
        Resumo do Orçamento
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Patient data */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Dados do Paciente
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Paciente</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione o paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {patient && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                  <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                    {patient.phone || "—"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data Nascimento</label>
                  <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                    {patient.birth_date
                      ? new Date(patient.birth_date + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Resumo Financeiro
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Data</span>
              <span className="text-slate-700 font-medium">{today}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total de itens</span>
              <span className="text-slate-700 font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor mensal</span>
              <span className="text-cyan-700 font-bold">
                {fmt(selection.monthlyFinal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                Valor total ({INSTALLMENTS}x)
              </span>
              <span className="text-slate-800 font-bold">
                {fmt(selection.total)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
              <span className="text-green-600 font-medium">À vista (5% desc.)</span>
              <span className="text-green-700 font-bold">
                {fmt(selection.cashValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs text-slate-500 font-medium w-12">#</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium">Procedimento</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium hidden sm:table-cell">Benefício</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Entrada</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-center">Qtd</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Total</th>
              <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right hidden sm:table-cell">À Vista</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400">{item.id}</td>
                <td className="px-4 py-3 text-slate-800 font-medium">{item.procedure}</td>
                <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{item.benefit}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {item.entry > 0 ? fmt(item.entry) : "—"}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{item.qty}</td>
                <td className="px-4 py-3 text-right text-slate-800 font-medium">
                  {fmt(item.total)}
                </td>
                <td className="px-4 py-3 text-right text-green-700 font-medium hidden sm:table-cell">
                  {fmt(item.totalCash)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-slate-700">
                Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">
                {fmt(selection.total)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-green-700 hidden sm:table-cell">
                {fmt(selection.cashValue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Additional fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Dia de vencimento
          </label>
          <select
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-cyan-300 transition">
          <input
            type="checkbox"
            checked={isCash}
            onChange={(e) => setIsCash(e.target.checked)}
            className="accent-cyan-600 rounded"
          />
          <div>
            <span className="text-sm text-slate-700 font-medium">À vista</span>
            <p className="text-xs text-slate-500">5% de desconto</p>
          </div>
        </label>

        <label className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-cyan-300 transition">
          <input
            type="checkbox"
            checked={isPlanComplement}
            onChange={(e) => setIsPlanComplement(e.target.checked)}
            className="accent-cyan-600 rounded"
          />
          <div>
            <span className="text-sm text-slate-700 font-medium">
              Complemento de plano
            </span>
          </div>
        </label>
      </div>

      <div className="mb-6">
        <label className="block text-xs text-slate-500 mb-1">
          Observações adicionais
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="Observações sobre o orçamento..."
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-between">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar
        </button>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-6 py-2.5 rounded-lg text-sm font-medium transition border border-red-200"
          >
            <XCircle size={16} />
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <CheckCircle size={16} />
            {isPending ? "Salvando..." : "Aprovar"}
          </button>
        </div>
      </div>
    </div>
  );
}
