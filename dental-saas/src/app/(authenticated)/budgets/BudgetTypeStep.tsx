"use client";

import { Smile, Stethoscope } from "lucide-react";

export default function BudgetTypeStep({
  onSelect,
}: {
  onSelect: (type: "ORTHO" | "SPECIALTY") => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 text-center mb-2">
        Novo Orçamento
      </h2>
      <p className="text-sm text-slate-500 text-center mb-8">
        Selecione o tipo de orçamento
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <button
          onClick={() => onSelect("ORTHO")}
          className="group bg-white rounded-xl border-2 border-slate-200 hover:border-cyan-400 p-8 transition-all hover:shadow-lg text-left"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-cyan-50 rounded-2xl group-hover:bg-cyan-100 transition">
              <Smile size={40} className="text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ortodontia</h3>
              <p className="text-sm text-slate-500 mt-1">
                Aparelho tradicional, cerâmico, autoligado, safira ou Invisalign
              </p>
            </div>
            <span className="text-sm font-medium text-cyan-600 group-hover:text-cyan-700">
              Escolher →
            </span>
          </div>
        </button>

        <button
          onClick={() => onSelect("SPECIALTY")}
          className="group bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-400 p-8 transition-all hover:shadow-lg text-left"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition">
              <Stethoscope size={40} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Especialidades</h3>
              <p className="text-sm text-slate-500 mt-1">
                Implantes, próteses, endodontia, periodontia e outros
              </p>
            </div>
            <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
              Escolher →
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
