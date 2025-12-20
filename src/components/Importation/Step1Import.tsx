import * as React from "react";
import * as XLSX from "xlsx";

export type ColumnMapping = Record<string, string>;

type Step1DonePayload = {
  excelData: Record<string, any>[];
  excelColumns: string[];
  columnMapping: ColumnMapping;
  recipientColumn: string;
  varKeys: string[];
};

type Step1ImportAllColumnsProps = {
  excludeColumns?: string[];
  excludeColumnsRegex?: RegExp;
  onContinue?: (payload: Step1DonePayload) => void;
  showMessage?: (type: "success" | "error", text: string) => void;
};

/* =========================
   Helpers: normalización
   ========================= */
function stripAccents(s: string) {return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");}

function toVarKey(columnName: string) {
  return stripAccents(String(columnName)).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function makeUnique(keys: string[]) {
  const used = new Map<string, number>();
  return keys.map((k) => {
    const base = k || "col";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}_${n + 1}`;
  });
}

function guessEmailColumn(columns: string[]) {
  const lower = columns.map((c) => stripAccents(String(c).toLowerCase()));
  const idx = lower.findIndex((c) => /(^|_|\s)(email|correo|mail)(_|$|\s)/.test(c) || /email|correo|mail/.test(c));
  return idx >= 0 ? columns[idx] : "";
}

export const Step1Import: React.FC<Step1ImportAllColumnsProps> = ({excludeColumns = [], excludeColumnsRegex, onContinue, showMessage,}) => {
  const [excelData, setExcelData] = React.useState<Record<string, any>[]>([]);
  const [excelColumns, setExcelColumns] = React.useState<string[]>([]);
  const [recipientColumn, setRecipientColumn] = React.useState<string>("");

  // Todas las variables (keys) generadas por columnas (filtradas)
  const [varKeys, setVarKeys] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<ColumnMapping>({});

  const notify = React.useCallback(
    (type: "success" | "error", text: string) => {
      if (showMessage) return showMessage(type, text);
      if (type === "error") console.error(text);
      else console.log(text);
    },
    [showMessage]
  );

  const hasData = excelData.length > 0;

  const excludesLower = React.useMemo(
    () => new Set(excludeColumns.map((c) => stripAccents(String(c)).toLowerCase())),
    [excludeColumns]
  );

  const visibleColumns = React.useMemo(() => {
    if (!excelColumns.length) return [];
    return excelColumns.filter((c) => {
      const cl = stripAccents(String(c)).toLowerCase().trim();
      if (excludesLower.has(cl)) return false;
      if (excludeColumnsRegex && excludeColumnsRegex.test(cl)) return false;
      return true;
    });
  }, [excelColumns, excludesLower, excludeColumnsRegex]);

  const canContinue = hasData && !!recipientColumn;

  /* =========================
     File -> parse excel
     ========================= */
  const handleFile = React.useCallback(
    async (file: File) => {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const first = wb.SheetNames[0];
        const sheet = wb.Sheets[first];

        const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (!json || json.length < 2) {
          notify("error", "El archivo no contiene registros.");
          return;
        }

        const columns = (json[0] ?? []).map((c) => String(c));
        const rows = json.slice(1).map((row) => {
          const obj: Record<string, any> = {};
          columns.forEach((col, i) => (obj[col] = row?.[i] ?? ""));
          return obj;
        });

        setExcelColumns(columns);
        setExcelData(rows);

        // recipient guess (solo sugerencia, el usuario puede cambiar)
        const emailGuess = guessEmailColumn(columns);
        setRecipientColumn(emailGuess);

        // construimos variables para columnas visibles (no recipient especial)
        const vCols = columns.filter((c) => {
          const cl = stripAccents(String(c)).toLowerCase().trim();
          if (excludesLower.has(cl)) return false;
          if (excludeColumnsRegex && excludeColumnsRegex.test(cl)) return false;
          return true;
        });

        const rawKeys = vCols.map(toVarKey);
        const uniqueKeys = makeUnique(rawKeys);

        const nextMapping: ColumnMapping = {};
        uniqueKeys.forEach((k, i) => {
          nextMapping[k] = vCols[i];
        });

        setVarKeys(uniqueKeys);
        setColumnMapping(nextMapping);

        notify("success", "Base de datos cargada correctamente.");
      } catch (e) {
        notify("error", "Error al procesar el archivo Excel.");
      }
    },
    [excludeColumnsRegex, excludesLower, notify]
  );

  const onUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleFile(file);
    e.target.value = "";
  };

  const doContinue = () => {
    if (!canContinue) {
      notify("error", "Selecciona el campo de Email Destinatario para continuar.");
      return;
    }
    onContinue?.({excelData, excelColumns, columnMapping, recipientColumn, varKeys,});
  };

  return (
    <section id="view-step-1" className="step-view grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in h-full">
      {/* LEFT: Config */}
      <div className="lg:col-span-4 glass-card p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuración</h2>
        <p className="text-slate-500 text-sm mb-8 font-medium">
          Sube tu base de datos en Excel para iniciar.
        </p>

        <div className="mb-8">
          <label className="group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-white hover:border-indigo-400 transition-all">
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">Cargar Archivo Excel</span>
            </div>

            <input id="excel-upload" type="file" className="hidden" accept=".xlsx,.xls" onChange={onUploadChange}/>
          </label>
        </div>

        {/* Mapping (solo recipient) + lista de variables generadas */}
        <div id="mapping-container" className={`space-y-4 ${hasData ? "" : "hidden"}`}>
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
              Variables de Datos
            </h3>
          </div>

          {/* Selector de Email */}
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-2">
            <label className="text-[9px] font-black text-emerald-700 uppercase block mb-1">
              Campo Email Destinatario(s)
            </label>

            <select className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none cursor-pointer" value={recipientColumn} onChange={(e) => setRecipientColumn(e.target.value)}>
              <option value="">Seleccionar campo...</option>
              {excelColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Resumen rápido de variables generadas */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Variables generadas
              </span>
              <span className="text-[10px] font-black text-indigo-600">
                {varKeys.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {varKeys.slice(0, 30).map((k) => (
                <span key={k} className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-200" title={columnMapping[k]}>
                  {`{{${k}}}`}
                </span>
              ))}
              {varKeys.length > 30 && (
                <span className="text-[10px] font-bold text-slate-400">
                  +{varKeys.length - 30} más…
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Empty / Summary */}
      <div className="lg:col-span-8 flex flex-col h-full">
        {/* Empty state */}
        <div id="empty-state" className={`glass-card flex-grow flex flex-col items-center justify-center text-center p-12 bg-white/50 border-dashed ${hasData ? "hidden" : ""}`}>
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-400">Sin origen de datos</h3>
        </div>

        {/* Summary */}
        <div id="data-summary" className={`glass-card p-8 fade-in border-indigo-100 border-2 ${hasData ? "" : "hidden"}`}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-800">Datos Listos</h3>
              <p className="text-slate-500 text-sm">
                Validación de estructura completada.
              </p>
            </div>

            <button type="button" onClick={doContinue} disabled={!canContinue} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0" title={!recipientColumn ? "Selecciona el campo de Email Destinatario" : ""}>
              Continuar al Diseñador
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Registros
              </span>
              <span className="text-3xl font-black text-indigo-600">{excelData.length}</span>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Campo Email
              </span>
              <span className="text-sm font-bold text-slate-700 truncate block">
                {recipientColumn || "N/A"}
              </span>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border-2 border-indigo-50">
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Variables disponibles
              </span>
              <span className="text-3xl font-black text-slate-800">
                {varKeys.length}
              </span>
            </div>
          </div>

          {/* Debug visual opcional: muestra primeras columnas */}
          <div className="mt-6 p-5 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Columnas detectadas
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {visibleColumns.length > 14 ? `14 / ${excelColumns.length}` : `${visibleColumns.length} / ${excelColumns.length}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleColumns.slice(0, 14).map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700">
                  {c}
                </span>
              ))}
              {visibleColumns.length > 14 && (
                <span className="text-[10px] font-bold text-slate-400">
                  +{visibleColumns.length - 14} más…
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
