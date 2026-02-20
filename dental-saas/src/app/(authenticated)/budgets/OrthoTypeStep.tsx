"use client";

import { Brackets, ScanLine } from "lucide-react";

export default function OrthoTypeStep({
  onSelect,
  onBack,
}: {
  onSelect: (type: "TRADICIONAL" | "INVISALIGN") => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 text-center mb-2">
        Tipo de Ortodontia
      </h2>
      <p className="text-sm text-slate-500 text-center mb-8">
        Escolha a modalidade de tratamento
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <button
          onClick={() => onSelect("TRADICIONAL")}
          className="group bg-white rounded-xl border-2 border-slate-200 hover:border-cyan-400 p-8 transition-all hover:shadow-lg"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-cyan-50 rounded-2xl group-hover:bg-cyan-100 transition">
              <Brackets size={40} className="text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Tradicional</h3>
              <p className="text-sm text-slate-500 mt-1">
                Convencional, Cerâmico, Autoligado ou Safira
              </p>
            </div>
            <span className="text-sm font-medium text-cyan-600 group-hover:text-cyan-700">
              Escolher →
            </span>
          </div>
        </button>

        <button
          onClick={() => onSelect("INVISALIGN")}
          className="group bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-400 p-8 transition-all hover:shadow-lg"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition">
              <ScanLine size={40} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Alinhador Invisível
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Invisalign Lite, Moderate ou Comprehensive
              </p>
            </div>
            <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
              Escolher →
            </span>
          </div>
        </button>
      </div>

      <div className="text-center mt-8">
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
