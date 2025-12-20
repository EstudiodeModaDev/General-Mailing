import * as React from "react";
import type { Log } from "../Envio/Send";
import { exportLogToExcel } from "../../utils/excel";

type Step4Props = {
  logs: Log[];
  onBack: () => void;
};

const fmtDate = (ts: Log["fecha"]) => {
  const d =
    ts instanceof Date
      ? ts
      : typeof ts === "number"
      ? new Date(ts)
      : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const statusBadge = (s: Log["estado"]) => {
  if (s === "SENT") return "bg-emerald-100 text-emerald-700";
  if (s === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
};

export const Step4AuditView: React.FC<Step4Props> = ({ logs, onBack }) => {
    const  [search, setSearch] = React.useState<string>("")
    const  [estado, setEstado] = React.useState<string>("")
    const total = logs.length;
    const sent = logs.filter((l) => l.estado === "SENT").length;
    const failed = logs.filter((l) => l.estado === "FAILED").length;

    const hasFilters = Boolean(search.trim()) || Boolean(estado);

    const filteredLogs = logs.filter((l) => {
    const text = search.trim().toLowerCase();

    const matchText =
        !text ||
        (l.asunto ?? "").toLowerCase().includes(text) ||
        (l.correo ?? "").toLowerCase().includes(text);

    // 👇 si estado está vacío, esto da true y deja pasar todos
    const matchEstado = !estado || l.estado === estado;

    return matchText && matchEstado;
    });


  return (
    <section id="view-step-4" className="step-view flex flex-col fade-in h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end mb-8 flex-shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Trazabilidad</h2>
          <p className="text-slate-500 font-medium"> Registro histórico de transacciones en tiempo real.</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {onBack && (
            <button onClick={onBack} className="px-5 py-3 rounded-xl font-black text-slate-600 bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition">
              Volver
            </button>
          )}
          <button onClick={() =>exportLogToExcel(logs)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 transition flex items-center gap-2 shadow-xl shadow-indigo-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Exportar Auditoría
          </button>
        </div>
      </div>

      {/* Summary + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* KPIs */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Resumen de campaña</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total: {total}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Enviados</div>
              <div className="text-2xl font-black text-emerald-600">{sent}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Fallidos</div>
              <div className="text-2xl font-black text-rose-600">{failed}</div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Tasa éxito</div>
              <div className="text-2xl font-black text-indigo-700">
                {total ? Math.round((sent / total) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Filtros</h3>
            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition" onClick={() => {setSearch(""); setEstado("")}}>Limpiar</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Buscar</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input type="text" placeholder="correo, asunto, pedido..." className="w-full bg-transparent outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400" value={search} onChange={(e) => setSearch(e.target.value)}/>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300 transition" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-grow overflow-hidden flex flex-col">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Temporalidad
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Destinatario
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Asunto
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 || (hasFilters && filteredLogs.length === 0)? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic tracking-wide">
                    Aún no hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.correo} className="hover:bg-slate-50/60 transition">
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 font-mono">
                      {fmtDate(l.fecha)}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">
                      {l.correo}
                    </td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-700">
                      <span className="block max-w-[360px] truncate">{l.asunto || "—"}</span>
                    </td>
                    <td className="px-8 py-5 text-center text-xs">
                      <span className={`px-3 py-1.5 rounded-full font-black uppercase ${statusBadge(l.estado)}`}>
                        {l.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
