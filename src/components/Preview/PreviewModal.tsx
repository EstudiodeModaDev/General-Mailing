import * as React from "react";

type PreviewModalProps = {
  open: boolean;
  onClose: () => void;
  subjectTemplate: string;
  htmlTemplate: string;
  excelData: Record<string, any>[];
  columnMapping: Record<string, string>; // varKey -> excelCol
  recipientColumn: string; // columna que contiene el email
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateEngine(template: string, row: Record<string, any>, mapping: Record<string, string>) {
  let result = template ?? "";

  for (const [varKey, excelCol] of Object.entries(mapping)) {
    if (!excelCol) continue;
    const value = row?.[excelCol];
    const re = new RegExp(`{{\\s*${escapeRegExp(varKey)}\\s*}}`, "g");
    result = result.replace(re, value == null ? "" : String(value));
  }

  return result;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({open, onClose, subjectTemplate, htmlTemplate, excelData, columnMapping, recipientColumn,}) => {
  const row0 = excelData?.[0] ?? null;

  const renderedSubject = React.useMemo(() => {
    if (!row0) return "";
    return templateEngine(subjectTemplate, row0, columnMapping);
  }, [row0, subjectTemplate, columnMapping]);

  const renderedHtml = React.useMemo(() => {
    if (!row0) return "";
    return templateEngine(htmlTemplate, row0, columnMapping);
  }, [row0, htmlTemplate, columnMapping]);

  const recipientEmail = React.useMemo(() => {
    if (!row0 || !recipientColumn) return "";
    const v = row0[recipientColumn];
    return v == null ? "" : String(v);
  }, [row0, recipientColumn]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 modal-backdrop z-50">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-full max-h-[95vh] overflow-hidden">
        {/* Top bar */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-400" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <h3 className="ml-4 text-sm font-black text-slate-500 uppercase tracking-widest">
              Simulación de Entrega Individual
            </h3>
          </div>

          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition" aria-label="Cerrar">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-12 bg-slate-100/50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 mx-auto max-w-[850px]">
            {!row0 ? (
              <div className="text-center text-slate-500 font-bold">
                No hay datos cargados para previsualizar.
              </div>
            ) : (
              <>
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <div className="flex gap-4 items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase w-12">Asunto:</span>
                    <h4 className="text-xl font-bold text-slate-800">{renderedSubject || "—"}</h4>
                  </div>

                  <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase w-12">Para:</span>
                    <span className="text-sm font-bold text-indigo-600">{recipientEmail || "—"}</span>
                  </div>
                </div>

                {/* cuerpo del correo */}
                <div className="text-slate-700 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: renderedHtml }}/>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end bg-white flex-shrink-0">
          <button type="button" onClick={onClose} className="bg-slate-800 text-white px-10 py-3 rounded-xl font-black hover:bg-black transition">
            Cerrar Validación
          </button>
        </div>
      </div>
    </div>
  );
};
