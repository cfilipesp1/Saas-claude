"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  createCostCenter,
  deleteCostCenter,
} from "@/actions/financial";
import { Plus, X, Trash2 } from "lucide-react";

interface CatRow {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface CCRow {
  id: string;
  name: string;
  created_at: string;
}

export default function SettingsClient({
  categories,
  costCenters,
}: {
  categories: CatRow[];
  costCenters: CCRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showCCForm, setShowCCForm] = useState(false);

  const inCategories = categories.filter((c) => c.type === "IN");
  const outCategories = categories.filter((c) => c.type === "OUT");

  function handleCreateCategory(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowCatForm(false);
      router.refresh();
    });
  }

  function handleDeleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleCreateCostCenter(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCostCenter(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowCCForm(false);
      router.refresh();
    });
  }

  function handleDeleteCostCenter(id: string) {
    if (!confirm("Excluir este centro de custo?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCostCenter(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
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

      <h2 className="text-xl font-bold text-slate-800 mb-6">
        Configurações Financeiras
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Categorias</h3>
            <button
              onClick={() => setShowCatForm(true)}
              className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              <Plus size={16} />
              Nova
            </button>
          </div>

          {showCatForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <form action={handleCreateCategory} className="flex gap-2">
                <input
                  name="name"
                  required
                  placeholder="Nome da categoria *"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  name="type"
                  required
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="IN">Receita</option>
                  <option value="OUT">Despesa</option>
                </select>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isPending ? "..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="text-slate-400"
                >
                  <X size={18} />
                </button>
              </form>
            </div>
          )}

          {/* Revenue categories */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
              Receita
            </p>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
              {inCategories.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 italic">
                  Nenhuma categoria de receita
                </p>
              ) : (
                inCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-slate-700">{c.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense categories */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
              Despesa
            </p>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
              {outCategories.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 italic">
                  Nenhuma categoria de despesa
                </p>
              ) : (
                outCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-slate-700">{c.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cost Centers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">
              Centros de Custo
            </h3>
            <button
              onClick={() => setShowCCForm(true)}
              className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              <Plus size={16} />
              Novo
            </button>
          </div>

          {showCCForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <form action={handleCreateCostCenter} className="flex gap-2">
                <input
                  name="name"
                  required
                  placeholder="Nome do centro de custo *"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isPending ? "..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCCForm(false)}
                  className="text-slate-400"
                >
                  <X size={18} />
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
            {costCenters.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400 italic">
                Nenhum centro de custo
              </p>
            ) : (
              costCenters.map((cc) => (
                <div
                  key={cc.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span className="text-sm text-slate-700">{cc.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCostCenter(cc.id)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
