"use client";

import { useState, useTransition } from "react";
import {
  createPatient,
  updatePatient,
  deletePatient,
} from "@/actions/patients";
import { Patient } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Search, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PatientsClient({
  initialData,
  initialSearch,
}: {
  initialData: Patient[];
  initialSearch: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(search ? `/patients?q=${encodeURIComponent(search)}` : "/patients");
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createPatient(formData);
        setShowForm(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar paciente");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updatePatient(formData);
        setEditing(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao atualizar paciente");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePatient(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao excluir paciente");
      }
    });
  }

  const fields = (defaults?: Patient) => (
    <>
      <input
        name="name"
        required
        defaultValue={defaults?.name}
        placeholder="Nome *"
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
      <input
        name="phone"
        defaultValue={defaults?.phone}
        placeholder="Telefone"
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
      <input
        name="email"
        type="email"
        defaultValue={defaults?.email}
        placeholder="Email"
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
      <input
        name="cpf"
        defaultValue={defaults?.cpf}
        placeholder="CPF"
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
      <input
        name="birth_date"
        type="date"
        defaultValue={defaults?.birth_date || ""}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
      <input
        name="notes"
        defaultValue={defaults?.notes}
        placeholder="Observações"
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
      />
    </>
  );

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Pacientes</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex flex-1 sm:flex-none">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full sm:w-56 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </form>
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
            }}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
          >
            <Plus size={16} />
            Novo
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Novo Paciente</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields()}
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 lg:col-span-3 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
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
            <h3 className="font-semibold text-slate-700">Editar Paciente</h3>
            <button onClick={() => setEditing(null)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="hidden" name="id" value={editing.id} />
            {fields(editing)}
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 lg:col-span-3 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Atualizar"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Email</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialData.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">
                  Nenhum paciente encontrado
                </td>
              </tr>
            )}
            {initialData.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <button
                    onClick={() => router.push(`/patients/${p.id}`)}
                    className="text-cyan-700 hover:text-cyan-800 hover:underline text-left"
                  >
                    {p.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{p.cpf || "—"}</td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.email || "—"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => router.push(`/patients/${p.id}`)}
                    title="Abrir cadastro"
                    className="text-slate-400 hover:text-cyan-600 transition"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(p);
                      setShowForm(false);
                    }}
                    title="Edição rápida"
                    className="text-slate-400 hover:text-cyan-600 transition"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    title="Excluir"
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
