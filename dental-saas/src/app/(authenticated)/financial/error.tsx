"use client";

import { useEffect } from "react";

export default function FinancialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: "error",
      message: "Unhandled error in financial module",
      error: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Erro no modulo financeiro
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Ocorreu um erro ao carregar os dados financeiros. Seus dados estao seguros.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
