"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBudget } from "@/actions/budgets";
import { X, FileText, CheckCircle, Trash2 } from "lucide-react";
import { updateBudgetStatus, deleteBudget } from "@/actions/budgets";
import BudgetTypeStep from "./BudgetTypeStep";
import type { BudgetTypeOption } from "./BudgetTypeStep";
import OrthoModelStep from "./OrthoModelStep";
import InvisalignStep from "./InvisalignStep";
import BudgetSummaryStep from "./BudgetSummaryStep";
import type { OrthoModel } from "./constants";

interface PatientInfo {
  id: string;
  name: string;
  phone: string;
  birth_date: string | null;
}

interface BudgetRow {
  id: string;
  type: string;
  ortho_type: string | null;
  model: string;
  monthly_value: number;
  installments: number;
  total: number;
  cash_value: number;
  is_cash: boolean;
  status: string;
  created_at: string;
  patient?: { id: string; name: string } | null;
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const STEP_LABELS = ["Tipo", "Modelo", "Resumo"];

export default function BudgetsClient({
  budgets,
  patients,
}: {
  budgets: BudgetRow[];
  patients: PatientInfo[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [budgetType, setBudgetType] = useState<"ORTHO" | "SPECIALTY" | null>(null);
  const [orthoType, setOrthoType] = useState<"TRADICIONAL" | "INVISALIGN" | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  function resetWizard() {
    setWizardOpen(false);
    setStep(0);
    setBudgetType(null);
    setOrthoType(null);
    setSelection(null);
  }

  function handleTypeSelect(type: BudgetTypeOption) {
    if (type === "ORTHO_FIXA") {
      setBudgetType("ORTHO");
      setOrthoType("TRADICIONAL");
      setStep(1);
    } else if (type === "INVISALIGN") {
      setBudgetType("ORTHO");
      setOrthoType("INVISALIGN");
      setStep(1);
    } else {
      // SPECIALTY: future implementation
      setBudgetType("SPECIALTY");
    }
  }

  function handleModelSelect(sel: Selection) {
    setSelection(sel);
    setStep(2);
  }

  function handleApprove(data: any) {
    setError(null);
    startTransition(async () => {
      const result = await createBudget(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetWizard();
      router.refresh();
    });
  }

  function handleStatusChange(id: string, status: string) {
    if (status === "cancelled" && !confirm("Cancelar este orçamento?")) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBudgetStatus(id, status);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este orçamento?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBudget(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function fmt(v: number) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Wizard view
  if (wizardOpen) {
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

        {/* Wizard progress */}
        {budgetType === "ORTHO" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEP_LABELS.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    idx <= step
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    idx <= step ? "text-cyan-700" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      idx < step ? "bg-cyan-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        {step === 0 && (
          <BudgetTypeStep
            onSelect={(type) => {
              if (type === "SPECIALTY") {
                // SPECIALTY: close wizard, future implementation
                resetWizard();
              } else {
                handleTypeSelect(type);
              }
            }}
          />
        )}

        {step === 1 && orthoType === "TRADICIONAL" && (
          <OrthoModelStep
            onSelect={handleModelSelect}
            onBack={() => setStep(0)}
          />
        )}

        {step === 1 && orthoType === "INVISALIGN" && (
          <InvisalignStep
            onSelect={handleModelSelect}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && selection && orthoType && (
          <BudgetSummaryStep
            orthoType={orthoType}
            selection={selection}
            patients={patients}
            onApprove={handleApprove}
            onCancel={resetWizard}
            onBack={() => setStep(1)}
            isPending={isPending}
          />
        )}
      </div>
    );
  }

  // List view
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
        <h2 className="text-2xl font-bold text-slate-800">Orçamentos</h2>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <FileText size={16} />
          Novo Orçamento
        </button>
      </div>

      {/* Budget list */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhum orçamento criado</p>
          <p className="text-sm text-slate-400 mt-1">
            Clique em &quot;Novo Orçamento&quot; para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const st = STATUS_LABELS[b.status] || STATUS_LABELS.pending;
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {b.patient?.name || "Sem paciente"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {b.type === "ORTHO" ? "Ortodontia" : "Especialidade"}
                      {b.ortho_type && ` · ${b.ortho_type === "TRADICIONAL" ? "Tradicional" : "Invisalign"}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                <p className="text-sm text-slate-700 font-medium mb-1">
                  {b.model}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-cyan-700">
                    {fmt(b.monthly_value)}
                  </span>
                  <span className="text-xs text-slate-500">/mês</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {b.installments}x · Total {fmt(b.total)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-3">
                  {new Date(b.created_at).toLocaleDateString("pt-BR")}
                </p>

                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  {b.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(b.id, "approved")}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        <CheckCircle size={14} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleStatusChange(b.id, "cancelled")}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        <X size={14} />
                        Cancelar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-slate-300 hover:text-red-500 ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
