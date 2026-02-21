"use client";

import { useEffect } from "react";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: "error",
      message: "Unhandled error in authenticated layout",
      error: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Algo deu errado
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Ocorreu um erro inesperado. Tente novamente ou recarregue a pagina.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
          >
            Recarregar pagina
          </button>
        </div>
      </div>
    </div>
  );
}
