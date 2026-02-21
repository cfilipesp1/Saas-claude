"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { updatePatient } from "@/actions/patients";
import { upsertAnamnesis } from "@/actions/anamnesis";
import type { Patient, Anamnesis } from "@/lib/types";
import {
  ArrowLeft,
  Pencil,
  X,
  Save,
  AlertTriangle,
  Heart,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Anamnesis fields that trigger the alert detection
const ALERT_CONDITIONS = [
  { key: "has_allergy", label: "Alergia" },
  { key: "has_heart_disease", label: "Cardiopatia" },
  { key: "has_diabetes", label: "Diabetes" },
  { key: "has_hypertension", label: "Hipertensão" },
  { key: "has_bleeding_disorder", label: "Distúrbio de coagulação" },
  { key: "is_pregnant", label: "Gestante" },
] as const;

function buildAlertItems(anamnesis: Anamnesis | null): string[] {
  if (!anamnesis) return [];
  const items: string[] = [];
  for (const c of ALERT_CONDITIONS) {
    if (anamnesis[c.key]) items.push(c.label);
  }
  if (anamnesis.uses_medication && anamnesis.medication_details) {
    items.push(`Medicação: ${anamnesis.medication_details}`);
  }
  if (anamnesis.has_alert && anamnesis.alert_message) {
    items.push(anamnesis.alert_message);
  }
  return items;
}

// Extracted outside the main component to avoid re-creation on every render
function AnamnesisToggle({
  name,
  label,
  detailName,
  detailLabel,
  checked,
  detail,
}: {
  name: string;
  label: string;
  detailName?: string;
  detailLabel?: string;
  checked: boolean;
  detail?: string;
}) {
  const [on, setOn] = useState(checked);
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name={name}
          defaultChecked={checked}
          onChange={(e) => setOn(e.target.checked)}
          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
      {detailName && on && (
        <input
          name={detailName}
          defaultValue={detail || ""}
          placeholder={detailLabel || "Detalhes..."}
          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
        />
      )}
    </div>
  );
}

export default function PatientDetailClient({
  patient,
  anamnesis,
}: {
  patient: Patient;
  anamnesis: Anamnesis | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [tab, setTab] = useState<"dados" | "anamnese">("dados");
  const [editingData, setEditingData] = useState(false);

  // Alert popup — shows on mount if anamnesis has relevant flags
  const alertItems = useMemo(() => buildAlertItems(anamnesis), [anamnesis]);
  const [showAlert, setShowAlert] = useState(alertItems.length > 0);

  // ---- Patient data update ----
  function handleUpdatePatient(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePatient(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditingData(false);
      router.refresh();
    });
  }

  // ---- Anamnesis update ----
  function handleSaveAnamnesis(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await upsertAnamnesis(patient.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Alert popup */}
      {showAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
              <AlertTriangle size={24} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Atenção — Alertas do Paciente
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-3">
                <strong>{patient.name}</strong> possui as seguintes condições
                que devem ser observadas:
              </p>
              <ul className="space-y-2 mb-6">
                {alertItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-800"
                  >
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowAlert(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/patients")}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
          <p className="text-sm text-slate-500">
            Cadastrado em{" "}
            {new Date(patient.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {alertItems.length > 0 && (
          <button
            onClick={() => setShowAlert(true)}
            className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
          >
            <AlertTriangle size={14} />
            {alertItems.length} alerta{alertItems.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("dados")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "dados"
              ? "bg-white text-cyan-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText size={16} />
          Dados Cadastrais
        </button>
        <button
          onClick={() => setTab("anamnese")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "anamnese"
              ? "bg-white text-cyan-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Heart size={16} />
          Anamnese
          {alertItems.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      {/* TAB: Dados Cadastrais */}
      {tab === "dados" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">
              Dados do Paciente
            </h3>
            {!editingData && (
              <button
                onClick={() => setEditingData(true)}
                className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                <Pencil size={14} />
                Editar
              </button>
            )}
            {editingData && (
              <button
                onClick={() => setEditingData(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {!editingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField label="Nome" value={patient.name} />
              <InfoField label="Código" value={patient.codigo} />
              <InfoField label="Telefone" value={patient.phone} />
              <InfoField label="Email" value={patient.email} />
              <InfoField
                label="Data de Nascimento"
                value={
                  patient.birth_date
                    ? new Date(patient.birth_date + "T12:00:00").toLocaleDateString("pt-BR")
                    : ""
                }
              />
              <InfoField label="Endereço" value={patient.address} />
              <InfoField label="Responsável Clínico" value={patient.responsavel_clinico_id} />
              <InfoField label="Responsável Ortodôntico" value={patient.responsavel_orto_id} />
            </div>
          ) : (
            <form
              action={handleUpdatePatient}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <input type="hidden" name="id" value={patient.id} />
              <FormField label="Nome *" name="name" defaultValue={patient.name} required />
              <FormField label="Código" name="codigo" defaultValue={patient.codigo} />
              <FormField label="Telefone" name="phone" defaultValue={patient.phone} />
              <FormField label="Email" name="email" type="email" defaultValue={patient.email} />
              <FormField
                label="Data de Nascimento"
                name="birth_date"
                type="date"
                defaultValue={patient.birth_date || ""}
              />
              <FormField label="Endereço" name="address" defaultValue={patient.address} />
              <FormField label="Responsável Clínico" name="responsavel_clinico_id" defaultValue={patient.responsavel_clinico_id} />
              <FormField label="Responsável Ortodôntico" name="responsavel_orto_id" defaultValue={patient.responsavel_orto_id} />
              <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingData(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  <Save size={14} />
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB: Anamnese */}
      {tab === "anamnese" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">
            Anamnese / Histórico de Saúde
          </h3>
          <form action={handleSaveAnamnesis} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnamnesisToggle
                name="has_allergy"
                label="Possui alergia"
                detailName="allergy_details"
                detailLabel="Quais alergias?"
                checked={anamnesis?.has_allergy ?? false}
                detail={anamnesis?.allergy_details}
              />
              <AnamnesisToggle
                name="has_heart_disease"
                label="Cardiopatia"
                detailName="heart_details"
                detailLabel="Qual cardiopatia?"
                checked={anamnesis?.has_heart_disease ?? false}
                detail={anamnesis?.heart_details}
              />
              <AnamnesisToggle
                name="has_diabetes"
                label="Diabetes"
                detailName="diabetes_details"
                detailLabel="Tipo / detalhes"
                checked={anamnesis?.has_diabetes ?? false}
                detail={anamnesis?.diabetes_details}
              />
              <AnamnesisToggle
                name="has_hypertension"
                label="Hipertensão"
                detailName="hypertension_details"
                detailLabel="Detalhes"
                checked={anamnesis?.has_hypertension ?? false}
                detail={anamnesis?.hypertension_details}
              />
              <AnamnesisToggle
                name="has_bleeding_disorder"
                label="Distúrbio de coagulação"
                detailName="bleeding_details"
                detailLabel="Detalhes"
                checked={anamnesis?.has_bleeding_disorder ?? false}
                detail={anamnesis?.bleeding_details}
              />
              <AnamnesisToggle
                name="uses_medication"
                label="Usa medicação contínua"
                detailName="medication_details"
                detailLabel="Quais medicamentos?"
                checked={anamnesis?.uses_medication ?? false}
                detail={anamnesis?.medication_details}
              />
              <AnamnesisToggle
                name="is_pregnant"
                label="Gestante"
                checked={anamnesis?.is_pregnant ?? false}
              />
              <AnamnesisToggle
                name="is_smoker"
                label="Fumante"
                checked={anamnesis?.is_smoker ?? false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Outras condições / Observações
              </label>
              <textarea
                name="other_conditions"
                rows={3}
                defaultValue={anamnesis?.other_conditions || ""}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                placeholder="Informações adicionais sobre a saúde do paciente..."
              />
            </div>

            {/* Alert configuration */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-medium text-slate-700 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Alerta personalizado
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_alert"
                    defaultChecked={anamnesis?.has_alert ?? false}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">
                    Exibir alerta adicional ao abrir cadastro
                  </span>
                </label>
                <input
                  name="alert_message"
                  defaultValue={anamnesis?.alert_message || ""}
                  placeholder="Mensagem do alerta personalizado..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <Save size={14} />
                {isPending ? "Salvando..." : "Salvar Anamnese"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
    </div>
  );
}
