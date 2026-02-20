"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  INVISALIGN_MODELS,
  MANDATORY_UPSELLS,
  OPTIONAL_UPSELLS,
  INSTALLMENTS,
  CASH_DISCOUNT,
  type OrthoModel,
  type OptionalUpsell,
} from "./constants";

interface Selection {
  model: OrthoModel;
  mandatoryUpsellId: string;
  mandatoryDelta: number;
  optionalUpsellIds: string[];
  monthlyFinal: number;
  total: number;
  cashValue: number;
}

export default function InvisalignStep({
  onSelect,
  onBack,
}: {
  onSelect: (selection: Selection) => void;
  onBack: () => void;
}) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [mandatoryUpsell, setMandatoryUpsell] = useState(MANDATORY_UPSELLS[0].id);
  const [optionalIds, setOptionalIds] = useState<Set<string>>(new Set());

  const selectedModel = INVISALIGN_MODELS.find((m) => m.id === selectedModelId);

  function toggleOptional(id: string) {
    const next = new Set(optionalIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOptionalIds(next);
  }

  function calcMonthly(model: OrthoModel) {
    const mandDelta =
      MANDATORY_UPSELLS.find((u) => u.id === mandatoryUpsell)?.monthlyDelta ?? 0;
    const optDelta = OPTIONAL_UPSELLS.filter((u) => optionalIds.has(u.id)).reduce(
      (s, u) => s + u.monthlyDelta,
      0
    );
    return model.monthlyBase + mandDelta + optDelta;
  }

  function handleConfirm() {
    if (!selectedModel) return;
    const mandDelta =
      MANDATORY_UPSELLS.find((u) => u.id === mandatoryUpsell)?.monthlyDelta ?? 0;
    const monthlyFinal = calcMonthly(selectedModel);
    const total = Math.round(monthlyFinal * INSTALLMENTS * 100) / 100;
    const cashValue = Math.round(total * (1 - CASH_DISCOUNT) * 100) / 100;

    onSelect({
      model: selectedModel,
      mandatoryUpsellId: mandatoryUpsell,
      mandatoryDelta: mandDelta,
      optionalUpsellIds: Array.from(optionalIds),
      monthlyFinal,
      total,
      cashValue,
    });
  }

  function fmt(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 text-center mb-2">
        Escolha o Plano Invisalign
      </h2>
      <p className="text-sm text-slate-500 text-center mb-6">
        Selecione o plano de alinhadores invisíveis
      </p>

      {/* Model cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        {INVISALIGN_MODELS.map((model) => {
          const isSelected = selectedModelId === model.id;
          const monthly = calcMonthly(model);
          return (
            <button
              key={model.id}
              onClick={() => setSelectedModelId(model.id)}
              className={`relative bg-white rounded-xl border-2 p-5 text-left transition-all hover:shadow-lg ${
                isSelected
                  ? "border-indigo-500 shadow-md ring-2 ring-indigo-200"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <div className="mb-3">
                <p className="text-2xl font-bold text-indigo-700">
                  {fmt(monthly)}
                </p>
                <p className="text-xs text-slate-500">/ mês</p>
              </div>
              <p className="text-xs text-amber-600 mb-3">
                *{fmt(model.lateMonthly + (monthly - model.monthlyBase))} se pago
                após vencimento.
              </p>
              <h4 className="text-sm font-bold text-slate-800 mb-2">
                {model.name}
              </h4>
              {model.benefits.map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-1.5 text-xs text-green-700"
                >
                  <Check size={12} />
                  <span>{b}</span>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      {/* Upsells */}
      {selectedModel && (
        <div className="max-w-2xl mx-auto space-y-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Incluir pacote obrigatório
            </h4>
            <div className="space-y-2">
              {MANDATORY_UPSELLS.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                    mandatoryUpsell === u.id
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mandatory_upsell_inv"
                    checked={mandatoryUpsell === u.id}
                    onChange={() => setMandatoryUpsell(u.id)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700 flex-1">{u.title}</span>
                  {u.monthlyDelta > 0 && (
                    <span className="text-xs text-indigo-600 font-medium">
                      +{fmt(u.monthlyDelta)}/mês
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Incluir pacote opcional
            </h4>
            <div className="space-y-2">
              {OPTIONAL_UPSELLS.map((u: OptionalUpsell) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                    optionalIds.has(u.id)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={optionalIds.has(u.id)}
                    onChange={() => toggleOptional(u.id)}
                    className="accent-indigo-600 rounded"
                  />
                  <span className="text-sm text-slate-700 flex-1">{u.title}</span>
                  {(u.monthlyDelta > 0 || u.oneTimeDelta > 0) && (
                    <span className="text-xs text-indigo-600 font-medium">
                      {u.monthlyDelta > 0 && `+${fmt(u.monthlyDelta)}/mês`}
                      {u.oneTimeDelta > 0 && `+${fmt(u.oneTimeDelta)} único`}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-800">{selectedModel.name}</span>
                {" · "}{INSTALLMENTS}x de{" "}
                <span className="font-bold text-indigo-700">
                  {fmt(calcMonthly(selectedModel))}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Total: {fmt(calcMonthly(selectedModel) * INSTALLMENTS)} · À vista:{" "}
                {fmt(calcMonthly(selectedModel) * INSTALLMENTS * (1 - CASH_DISCOUNT))}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
