"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  fetchAppointments,
} from "@/actions/appointments";
import type { AppointmentStatus } from "@/lib/types";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Edit3,
  Calendar,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  scheduled: { label: "Agendado", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  confirmed: { label: "Confirmado", color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
  in_progress: { label: "Em Atendimento", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" },
  completed: { label: "Concluído", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelado", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", dot: "bg-slate-400" },
  no_show: { label: "Não Compareceu", color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
};

const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Helpers ────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toLocalDatetimeValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

// ─── Types ──────────────────────────────────────────────────

interface AppointmentRow {
  id: string;
  patient_id: string | null;
  professional_id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes: string;
  created_by: string | null;
  patient?: { id: string; name: string } | null;
  professional?: { id: string; name: string; specialty: string } | null;
}

// ─── Main Component ─────────────────────────────────────────

export default function ScheduleClient({
  initialAppointments,
  patients,
  professionals,
}: {
  initialAppointments: AppointmentRow[];
  patients: { id: string; name: string }[];
  professionals: { id: string; name: string; specialty: string }[];
}) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(initialAppointments);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [detailModal, setDetailModal] = useState<AppointmentRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formStartAt, setFormStartAt] = useState("");
  const router = useRouter();

  // ─── Date Navigation ────────────────────────────────────

  const navigate = useCallback(
    (dir: -1 | 0 | 1) => {
      if (dir === 0) {
        setCurrentDate(new Date());
        return;
      }
      const d = new Date(currentDate);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      setCurrentDate(d);
    },
    [currentDate, view]
  );

  const headerLabel = useCallback(() => {
    if (view === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
      return `${fmt(ws)} — ${fmt(we)}, ${we.getFullYear()}`;
    }
    return `${WEEKDAYS_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view]);

  // ─── Data Fetch on Navigate ─────────────────────────────

  function fetchRange(date: Date, v: ViewMode) {
    let start: Date;
    let end: Date;
    if (v === "month") {
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    } else if (v === "week") {
      start = startOfWeek(date);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59);
    } else {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59);
    }
    startTransition(async () => {
      const data = await fetchAppointments(start.toISOString(), end.toISOString());
      setAppointments(data as AppointmentRow[]);
    });
  }

  function handleNavigate(dir: -1 | 0 | 1) {
    const d = new Date(currentDate);
    if (dir === 0) {
      const today = new Date();
      setCurrentDate(today);
      fetchRange(today, view);
      return;
    }
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
    fetchRange(d, view);
  }

  function handleViewChange(v: ViewMode) {
    setView(v);
    fetchRange(currentDate, v);
  }

  // ─── CRUD Handlers ──────────────────────────────────────

  function openCreateForm(presetDate?: Date) {
    setEditing(null);
    if (presetDate) {
      const start = new Date(presetDate);
      start.setHours(9, 0, 0, 0);
      setFormStartAt(toLocalDatetimeValue(start));
    } else {
      setFormStartAt("");
    }
    setShowForm(true);
  }

  function openEditForm(apt: AppointmentRow) {
    setEditing(apt);
    setFormStartAt(toLocalDatetimeValue(new Date(apt.start_at)));
    setShowForm(true);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateAppointment(formData)
        : await createAppointment(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setEditing(null);
      router.refresh();
      fetchRange(currentDate, view);
    });
  }

  function handleStatusChange(id: string, status: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, status);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDetailModal(null);
      router.refresh();
      fetchRange(currentDate, view);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este agendamento?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAppointment(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDetailModal(null);
      router.refresh();
      fetchRange(currentDate, view);
    });
  }

  // ─── Filter appointments for a day ──────────────────────

  function getAptsForDay(day: Date): AppointmentRow[] {
    return appointments.filter((a) => isSameDay(new Date(a.start_at), day));
  }

  // ─── Render: Month View ─────────────────────────────────

  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-semibold text-slate-500 text-center border-b border-slate-100">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-50" />;
            }
            const dayApts = getAptsForDay(cell);
            const isToday = isSameDay(cell, today);
            return (
              <div
                key={cell.toISOString()}
                className={`min-h-[100px] border-b border-r border-slate-50 p-1 cursor-pointer hover:bg-slate-50 transition ${
                  isToday ? "bg-cyan-50/50" : ""
                }`}
                onClick={() => {
                  setCurrentDate(cell);
                  handleViewChange("day");
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? "bg-cyan-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                        : "text-slate-600"
                    }`}
                  >
                    {cell.getDate()}
                  </span>
                  {dayApts.length > 0 && (
                    <span className="text-[10px] text-slate-400">{dayApts.length}</span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayApts.slice(0, 3).map((apt) => {
                    const cfg = STATUS_CONFIG[apt.status];
                    return (
                      <div
                        key={apt.id}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate ${cfg.bg} border`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModal(apt);
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="truncate">{formatTime(apt.start_at)} {apt.title || apt.patient?.name || "Agendamento"}</span>
                      </div>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <p className="text-[10px] text-slate-400 px-1">+{dayApts.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Render: Week View ──────────────────────────────────

  function renderWeekView() {
    const ws = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d;
    });
    const today = new Date();

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
            <div className="p-2" />
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <div
                  key={d.toISOString()}
                  className={`p-2 text-center border-l border-slate-100 cursor-pointer hover:bg-slate-50 ${
                    isToday ? "bg-cyan-50/50" : ""
                  }`}
                  onClick={() => {
                    setCurrentDate(d);
                    handleViewChange("day");
                  }}
                >
                  <p className="text-xs text-slate-500">{WEEKDAYS[d.getDay()]}</p>
                  <p className={`text-sm font-semibold ${isToday ? "text-cyan-700" : "text-slate-800"}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Time slots */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-50">
              <div className="p-1 text-[10px] text-slate-400 text-right pr-2 pt-1">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const dayApts = getAptsForDay(d).filter((a) => {
                  const h = new Date(a.start_at).getHours();
                  return h === hour;
                });
                return (
                  <div
                    key={d.toISOString() + hour}
                    className="min-h-[48px] border-l border-slate-50 p-0.5 cursor-pointer hover:bg-slate-50/50"
                    onClick={() => {
                      const preset = new Date(d);
                      preset.setHours(hour, 0, 0, 0);
                      setFormStartAt(toLocalDatetimeValue(preset));
                      openCreateForm(preset);
                    }}
                  >
                    {dayApts.map((apt) => {
                      const cfg = STATUS_CONFIG[apt.status];
                      return (
                        <div
                          key={apt.id}
                          className={`px-1 py-0.5 mb-0.5 rounded text-[10px] border truncate cursor-pointer ${cfg.bg}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModal(apt);
                          }}
                        >
                          <span className="font-medium">{formatTime(apt.start_at)}</span>{" "}
                          {apt.title || apt.patient?.name || "—"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render: Day View ───────────────────────────────────

  function renderDayView() {
    const today = new Date();
    const isToday = isSameDay(currentDate, today);

    return (
      <div className="bg-white rounded-xl border border-slate-200">
        {/* Day header */}
        <div className={`px-4 py-3 border-b border-slate-100 ${isToday ? "bg-cyan-50/50" : ""}`}>
          <p className="text-sm font-semibold text-slate-800">
            {WEEKDAYS_FULL[currentDate.getDay()]}, {currentDate.getDate()} de {MONTHS[currentDate.getMonth()]}
          </p>
        </div>
        {/* Time slots */}
        {HOURS.map((hour) => {
          const hourApts = getAptsForDay(currentDate).filter((a) => {
            const h = new Date(a.start_at).getHours();
            return h === hour;
          });
          return (
            <div key={hour} className="flex border-b border-slate-50">
              <div className="w-16 flex-shrink-0 p-2 text-xs text-slate-400 text-right pr-3 pt-2">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div
                className="flex-1 min-h-[56px] border-l border-slate-100 p-1 cursor-pointer hover:bg-slate-50/50"
                onClick={() => {
                  const preset = new Date(currentDate);
                  preset.setHours(hour, 0, 0, 0);
                  openCreateForm(preset);
                }}
              >
                {hourApts.map((apt) => {
                  const cfg = STATUS_CONFIG[apt.status];
                  return (
                    <div
                      key={apt.id}
                      className={`flex items-center gap-2 px-3 py-2 mb-1 rounded-lg border cursor-pointer ${cfg.bg}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailModal(apt);
                      }}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {formatTime(apt.start_at)} — {formatTime(apt.end_at)}
                          </span>
                          <span className={`text-[10px] font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {apt.title || "Agendamento"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {apt.patient && (
                            <span className="text-xs text-slate-500">{apt.patient.name}</span>
                          )}
                          {apt.professional && (
                            <span className="text-xs text-slate-400">
                              Dr(a). {apt.professional.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Render: Form Modal ─────────────────────────────────

  function renderFormModal() {
    if (!showForm) return null;

    const defaultEnd = () => {
      if (formStartAt) {
        const d = new Date(formStartAt);
        d.setHours(d.getHours() + 1);
        return toLocalDatetimeValue(d);
      }
      return "";
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {editing ? "Editar Agendamento" : "Novo Agendamento"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <form action={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div>
              <label className="block text-sm text-slate-600 mb-1">Título *</label>
              <input
                name="title"
                required
                defaultValue={editing?.title ?? ""}
                placeholder="Ex: Consulta de rotina"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Início *</label>
                <input
                  name="start_at"
                  type="datetime-local"
                  required
                  defaultValue={editing ? toLocalDatetimeValue(new Date(editing.start_at)) : formStartAt}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Término *</label>
                <input
                  name="end_at"
                  type="datetime-local"
                  required
                  defaultValue={editing ? toLocalDatetimeValue(new Date(editing.end_at)) : defaultEnd()}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Profissional *</label>
              <select
                name="professional_id"
                required
                defaultValue={editing?.professional_id ?? ""}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="">Selecione</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.specialty ? ` — ${p.specialty}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Paciente</label>
              <select
                name="patient_id"
                defaultValue={editing?.patient_id ?? ""}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="">Nenhum (horário bloqueado)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {editing && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editing.status}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-600 mb-1">Observações</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={editing?.notes ?? ""}
                placeholder="Observações opcionais..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {isPending ? "Salvando..." : editing ? "Atualizar" : "Criar Agendamento"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render: Detail Modal ───────────────────────────────

  function renderDetailModal() {
    if (!detailModal) return null;
    const apt = detailModal;
    const cfg = STATUS_CONFIG[apt.status];

    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Detalhes do Agendamento</h3>
            <button onClick={() => setDetailModal(null)}>
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-slate-800">{apt.title || "Agendamento"}</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={14} />
              <span>{formatTime(apt.start_at)} — {formatTime(apt.end_at)}</span>
              <span className="text-slate-400">
                {new Date(apt.start_at).toLocaleDateString("pt-BR")}
              </span>
            </div>

            {apt.professional && (
              <div className="text-sm text-slate-600">
                <span className="font-medium">Profissional:</span> {apt.professional.name}
                {apt.professional.specialty && ` (${apt.professional.specialty})`}
              </div>
            )}

            {apt.patient && (
              <div className="text-sm text-slate-600">
                <span className="font-medium">Paciente:</span> {apt.patient.name}
              </div>
            )}

            {apt.notes && (
              <div className="text-sm text-slate-600">
                <span className="font-medium">Observações:</span> {apt.notes}
              </div>
            )}

            {/* Quick status buttons */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Alterar status:</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.filter((s) => s !== apt.status).map((s) => {
                  const sc = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(apt.id, s)}
                      disabled={isPending}
                      className={`text-[11px] px-2 py-1 rounded border ${sc.bg} ${sc.color} hover:opacity-80 transition disabled:opacity-50`}
                    >
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setDetailModal(null);
                  openEditForm(apt);
                }}
                className="flex items-center gap-1.5 text-sm text-cyan-700 hover:text-cyan-800 font-medium"
              >
                <Edit3 size={14} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(apt.id)}
                disabled={isPending}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium ml-auto disabled:opacity-50"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
        <button
          onClick={() => openCreateForm()}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />
          Novo Agendamento
        </button>
      </div>

      {/* Navigation + View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate(0)}
            className="px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition"
          >
            Hoje
          </button>
          <button
            onClick={() => handleNavigate(-1)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleNavigate(1)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronRight size={18} />
          </button>
          <h3 className="text-lg font-semibold text-slate-800 ml-2">{headerLabel()}</h3>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                view === v
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 px-1">
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-[11px] text-slate-500">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {renderFormModal()}
      {renderDetailModal()}
    </div>
  );
}
