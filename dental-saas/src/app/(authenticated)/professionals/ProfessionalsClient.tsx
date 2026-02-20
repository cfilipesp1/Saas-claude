"use client";

import { useState, useTransition } from "react";
import {
  createProfessional,
  updateProfessional,
  deleteProfessional,
} from "@/actions/professionals";
import { Professional } from "@/lib/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfessionalsClient({
  initialData,
}: {
  initialData: Professional[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createProfessional(formData);
      setShowForm(false);
      router.refresh();
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateProfessional(formData);
      setEditing(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    startTransition(async () => {
      await deleteProfessional(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Profissionais</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
          }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Novo
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Novo Profissional</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="name"
              required
              placeholder="Nome"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <input
              name="specialty"
              placeholder="Especialidade"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Editar Profissional</h3>
            <button onClick={() => setEditing(null)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" value={editing.id} />
            <input
              name="name"
              required
              defaultValue={editing.name}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <input
              name="specialty"
              defaultValue={editing.specialty}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Ativo:</label>
              <select
                name="active"
                defaultValue={editing.active ? "true" : "false"}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Atualizar"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Especialidade</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialData.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400">
                  Nenhum profissional cadastrado
                </td>
              </tr>
            )}
            {initialData.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.specialty || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setShowForm(false);
                    }}
                    className="text-slate-400 hover:text-cyan-600 transition"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
