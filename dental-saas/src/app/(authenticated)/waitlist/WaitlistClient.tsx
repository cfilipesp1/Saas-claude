"use client";

import { useState, useTransition } from "react";
import {
  createWaitlistEntry,
  updateWaitlistStatus,
  deleteWaitlistEntry,
  getWaitlistEvents,
} from "@/actions/waitlist";
import type { WaitlistStatus, WaitlistEvent } from "@/lib/types";
import {
  Plus,
  X,
  ArrowRight,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_CONFIG: Record<
  WaitlistStatus,
  { label: string; color: string; bg: string }
> = {
  NEW: { label: "Novo", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  CONTACTING: {
    label: "Contatando",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  SCHEDULED: {
    label: "Agendado",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  UNREACHABLE: {
    label: "Sem Contato",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
  NO_SHOW: {
    label: "Não Compareceu",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200",
  },
  DONE: {
    label: "Concluído",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
};

const ALL_STATUSES: WaitlistStatus[] = [
  "NEW",
  "CONTACTING",
  "SCHEDULED",
  "UNREACHABLE",
  "NO_SHOW",
  "CANCELLED",
  "DONE",
];

const ACTIVE_STATUSES: WaitlistStatus[] = [
  "NEW",
  "CONTACTING",
  "SCHEDULED",
  "UNREACHABLE",
  "NO_SHOW",
];

interface EntryRow {
  id: string;
  patient_id: string;
  specialty: string;
  preferred_professional_id: string | null;
  priority: number;
  status: WaitlistStatus;
  notes: string;
  created_at: string;
  patient?: { id: string; name: string } | null;
  professional?: { id: string; name: string; specialty: string } | null;
}

export default function WaitlistClient({
  initialEntries,
  patients,
  professionals,
}: {
  initialEntries: EntryRow[];
  patients: { id: string; name: string }[];
  professionals: { id: string; name: string; specialty: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusModal, setStatusModal] = useState<EntryRow | null>(null);
  const [newStatus, setNewStatus] = useState<WaitlistStatus>("NEW");
  const [statusNote, setStatusNote] = useState("");
  const [eventsModal, setEventsModal] = useState<string | null>(null);
  const [events, setEvents] = useState<WaitlistEvent[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createWaitlistEntry(formData);
      setShowForm(false);
      router.refresh();
    });
  }

  function handleStatusChange() {
    if (!statusModal) return;
    startTransition(async () => {
      await updateWaitlistStatus(
        statusModal.id,
        statusModal.status,
        newStatus,
        statusNote
      );
      setStatusModal(null);
      setStatusNote("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este item da fila?")) return;
    startTransition(async () => {
      await deleteWaitlistEntry(id);
      router.refresh();
    });
  }

  function openEvents(entryId: string) {
    startTransition(async () => {
      const evts = await getWaitlistEvents(entryId);
      setEvents(evts);
      setEventsModal(entryId);
    });
  }

  const activeEntries = initialEntries.filter((e) =>
    ACTIVE_STATUSES.includes(e.status)
  );
  const archivedEntries = initialEntries.filter(
    (e) => e.status === "CANCELLED" || e.status === "DONE"
  );

  const grouped = ACTIVE_STATUSES.reduce(
    (acc, s) => {
      acc[s] = activeEntries.filter((e) => e.status === s);
      return acc;
    },
    {} as Record<string, EntryRow[]>
  );

  function renderCard(entry: EntryRow) {
    const cfg = STATUS_CONFIG[entry.status];
    return (
      <div
        key={entry.id}
        className={`rounded-lg border p-4 ${cfg.bg} space-y-2`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-800">
              {entry.patient?.name || "Paciente"}
            </p>
            {entry.specialty && (
              <p className="text-xs text-slate-500">{entry.specialty}</p>
            )}
          </div>
          {entry.priority > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              P{entry.priority}
            </span>
          )}
        </div>

        {entry.professional && (
          <p className="text-xs text-slate-500">
            Pref: {entry.professional.name}
          </p>
        )}

        {entry.notes && (
          <p className="text-xs text-slate-600 line-clamp-2">{entry.notes}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              setStatusModal(entry);
              setNewStatus(entry.status);
            }}
            className="flex items-center gap-1 text-xs text-cyan-700 hover:text-cyan-800 font-medium"
          >
            <ArrowRight size={12} />
            Alterar Status
          </button>
          <button
            onClick={() => openEvents(entry.id)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <Clock size={12} />
            Histórico
          </button>
          <button
            onClick={() => handleDelete(entry.id)}
            className="text-xs text-slate-400 hover:text-red-600 ml-auto"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Fila de Espera</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Novo na Fila</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form
            action={handleCreate}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <select
              name="patient_id"
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">Selecione Paciente *</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              name="specialty"
              placeholder="Especialidade"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <select
              name="preferred_professional_id"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">Profissional Preferido (opcional)</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.specialty ? ` — ${p.specialty}` : ""}
                </option>
              ))}
            </select>
            <input
              name="priority"
              type="number"
              min="0"
              defaultValue="0"
              placeholder="Prioridade (0 = normal)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <textarea
              name="notes"
              placeholder="Observações"
              rows={2}
              className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
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

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {ACTIVE_STATUSES.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const items = grouped[status] || [];
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-sm font-semibold ${cfg.color}`}
                >
                  {cfg.label}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Vazio</p>
                )}
                {items.map(renderCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Archived toggle */}
      {archivedEntries.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            {showArchived ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Concluídos / Cancelados ({archivedEntries.length})
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {archivedEntries.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Status change modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Alterar Status — {statusModal.patient?.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Novo Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as WaitlistStatus)
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Observação
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Motivo da alteração..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStatusModal(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events history modal */}
      {eventsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                Histórico de Eventos
              </h3>
              <button onClick={() => setEventsModal(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="border-l-2 border-cyan-300 pl-4 py-1"
                  >
                    <div className="flex items-center gap-2">
                      {ev.from_status && (
                        <>
                          <span className="text-xs font-medium text-slate-500">
                            {STATUS_CONFIG[ev.from_status]?.label ?? ev.from_status}
                          </span>
                          <ArrowRight size={12} className="text-slate-400" />
                        </>
                      )}
                      <span className="text-xs font-medium text-cyan-700">
                        {STATUS_CONFIG[ev.to_status]?.label ?? ev.to_status}
                      </span>
                    </div>
                    {ev.note && (
                      <p className="text-xs text-slate-600 mt-0.5">{ev.note}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
