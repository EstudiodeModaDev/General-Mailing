import * as React from "react";
import { useAuth } from "../../auth/authProvider";
import type { ColumnMapping } from "../Importation/Step1Import";
import { useGraphServices } from "../../Graph/GraphContext";
import type { GraphSendMailPayload } from "../../Graph/graphRest";
import { insertRowsByAnyoneLink } from "../../services/Log.Service";
import { GraphHttpError } from "../../Graph/graphRest";
import { getAccessToken } from "../../auth/msal";

function renderTemplate(
  template: string,
  row: Record<string, any>,
  columnMapping: Record<string, string>
) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, varName) => {
    const col = columnMapping[varName];
    if (!col) return "";
    const val = row[col];
    return val == null ? "" : String(val);
  });
}

function buildMailPayloadForRow(opts: {row: Record<string, any>; recipientColumn: string; columnMapping: Record<string, string>; subjectTemplate: string; htmlTemplate: string;}): { recipient: string; payload: GraphSendMailPayload } | null {
  const { row, recipientColumn, columnMapping, subjectTemplate, htmlTemplate } = opts;

  const recipient = String(row[recipientColumn] ?? "").trim();
  if (!recipient) return null;

  const subject = renderTemplate(subjectTemplate, row, columnMapping);
  const html = renderTemplate(htmlTemplate, row, columnMapping);

  const payload: GraphSendMailPayload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: recipient } }],
    },
    saveToSentItems: true,
  };

  return { recipient, payload };
}

function getSendMailFailReason(err: unknown): string {
  if (!(err instanceof GraphHttpError)) return "Fallo desconocido al enviar";

  // 401 / 403 => no autorizado (token/scope/política)
  if (err.status === 401) return `NO AUTORIZADO (401) token inválido/expirado`;
  if (err.status === 403) return `NO AUTORIZADO (403) sin permiso para enviar (Mail.Send / política)`;

  // Throttling
  if (err.status === 429) return `THROTTLED (429) demasiadas solicitudes`;

  // Otros casos comunes (opcionales)
  const code = (err.code ?? "").toLowerCase();
  if (code.includes("invalidauthenticationtoken")) return "NO AUTORIZADO token inválido";
  if (code.includes("erroraccessdenied") || code.includes("accessdenied")) return "NO AUTORIZADO acceso denegado";

  // fallback con detalle corto
  const short = (err.message ?? "").slice(0, 120);
  return `Fallo envío (${err.status}) ${err.code ?? ""} ${short}`.trim();
}

type Step3Props = {
  excelData: Record<string, any>[];
  recipientColum: string;
  columMapping: ColumnMapping;
  subject: string;
  htmlTemplate: string;
  onBack: () => void;
  onDone: () => void;
  setLog: (log: Log[]) => void;
};

export type Log = {
  correo: string;
  asunto: string;
  estado: string;
  fecha: Date;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function isValidEmail(v: any): boolean {
  return EMAIL_RE.test(String(v ?? "").trim());
}

function extractVars(template: string): string[] {
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) out.add(m[1]);
  return [...out];
}

const ANYONE_EDIT_LINK = "https://estudiodemoda-my.sharepoint.com/:x:/g/personal/dpalacios_estudiodemoda_com_co/IQDDaUkjtdgoSbR403iW5W8KAfvw0DpHtbPf_gFAgZAxpbY?e=Mv2fLi";
const LOGS_TABLE_NAME = "LogsTable";
const LOG_FLUSH_EVERY = 50;

function nowISO() {
  return new Date().toISOString();
}

export const Step3Send: React.FC<Step3Props> = ({excelData, recipientColum, subject, htmlTemplate, columMapping, onDone,  setLog,}) => {
  const { account } = useAuth();
  const { email } = useGraphServices();

  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [cantidad, setCantidad] = React.useState<number>(excelData.length);
  const [send, setSend] = React.useState<number>(0);

  const validation = React.useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!excelData.length) {
      errors.push("No hay datos cargados.");
    }

    if (!recipientColum?.trim()) {
      errors.push("No se ha definido la columna de destinatario.");
    }

    const validEmails = excelData.filter((r) => isValidEmail(r[recipientColum]));

    if (validEmails.length === 0) {
      errors.push("No hay correos válidos para enviar.");
    }

    if (!subject?.trim()) {
      errors.push("El asunto está vacío.");
    }

    if (!htmlTemplate?.trim()) {
      errors.push("El contenido del correo está vacío.");
    }

    const usedVars = [...extractVars(subject), ...extractVars(htmlTemplate)];
    const unknownVars = usedVars.filter((v) => !columMapping?.[v]);
    if (unknownVars.length) {
      warnings.push(`Variables sin mapear: ${unknownVars.join(", ")}`);
    }

    if (cantidad > excelData.length || cantidad <= 0) {
      errors.push("Cantidad de correos a enviar invalida");
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      stats: {
        total: excelData.length,
        validEmails: validEmails.length,
        invalidEmails: excelData.length - validEmails.length,
      },
    };
  }, [excelData, recipientColum, subject, htmlTemplate, columMapping, cantidad]);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validation.ok) return;

    setSubmitting(true);
    setSend(0);

    const resultados: Log[] = [];
    const rows = excelData.slice(0, cantidad);
    const excelLogRows: any[][] = [];

    const pushExcelLog = (msg: string, correo: string) => {
      excelLogRows.push([nowISO(), account?.username ?? "", "Envio de correo", correo, msg,]);
    };

    const flushLogs = async () => {
      if (!excelLogRows.length) return;
      const batch = excelLogRows.splice(0, excelLogRows.length);
      try {
        await insertRowsByAnyoneLink({anyoneEditLink: ANYONE_EDIT_LINK, tableName: LOGS_TABLE_NAME, rows: batch, chunkSize: 200,});
      } catch (err) {
        console.warn("[LOGS] No se pudieron guardar logs en Excel:", err);
      }
    };

    try {
        await getAccessToken({
            interactionMode: "popup",
            //silentExtraScopesToConsent: ["Mail.Send", "Files.ReadWrite.All"],
            //silentExtraScopesToConsent: ["Sites.ReadWrite.All"],
            noRedirect: true,
        });

      for (const row of rows) {
        const built = buildMailPayloadForRow({row, recipientColumn: recipientColum, columnMapping: columMapping, subjectTemplate: subject, htmlTemplate,});

        if (!built) {
          const badRecipient = String(row[recipientColum] ?? "").trim();

          resultados.push({asunto: subject, correo: badRecipient, estado: "FAILED", fecha: new Date(),});

          pushExcelLog("Fallo al enviar por correo invalido", badRecipient);
          setSend((prev) => prev + 1);
          if (excelLogRows.length >= LOG_FLUSH_EVERY) await flushLogs();
          continue;
        }

        try {
          await email.sendEmail(built.payload);

          resultados.push({asunto: built.payload.message.subject, correo: built.recipient, estado: "SENT", fecha: new Date(),});

          pushExcelLog("Enviado", built.recipient);
        } catch (err) {
            const reason = getSendMailFailReason(err);

            resultados.push({asunto: built.payload.message.subject, correo: built.recipient, estado: "FAILED", fecha: new Date(),});
            pushExcelLog(reason, built.recipient);
        } finally {
            setSend((prev) => prev + 1);
        }

        // flush parcial cada N logs
        if (excelLogRows.length >= LOG_FLUSH_EVERY) await flushLogs();
      }

      // flush final
      await flushLogs();

      setLog(resultados);
      onDone();
    } catch (error) {
      console.error("Error enviando los correos", error);
      alert("Ocurrió un error enviando los correos. Intenta de nuevo.");
      // intenta guardar lo que haya quedado en buffer, sin bloquear
      try {
        await flushLogs();
      } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  const pct = cantidad > 0 ? (send / cantidad) * 100 : 0;

  return (
    <section id="view-step-3" className="step-view grid grid-cols-1 lg:grid-cols-12 gap-8 fade-in h-full">
      <div className="lg:col-span-5 glass-card p-10 flex flex-col">
        <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">Confirmación</h2>

        <div className="space-y-6 flex-grow">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Cuenta con la se enviaran los correos</label>
            <div className="space-y-4">
              <input type="email" id="sender-email" readOnly defaultValue={`${account?.name ?? ""} (${account?.username ?? ""})`} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
            </div>
          </div>

          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">Los correos se enviarán de forma estrictamente individual. Los destinatarios no podrán verse entre sí.</p>
          </div>

          {/* Opcional: muestra warnings */}
          {validation.warnings.length ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="text-[10px] font-black uppercase text-amber-600 mb-2">Advertencias</div>
              <ul className="text-xs text-amber-900 space-y-1">
                {validation.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Opcional: muestra errores */}
          {!validation.ok && validation.errors.length ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <div className="text-[10px] font-black uppercase text-rose-600 mb-2">Errores</div>
              <ul className="text-xs text-rose-900 space-y-1">
                {validation.errors.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col">
        <div className="p-12 flex-grow flex flex-col justify-center items-center text-center bg-indigo-600 relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="400" cy="400" r="400" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 w-full max-w-sm">
            <span className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-6 block">Volumen de Entrega</span>

            <div className="flex items-center justify-center gap-6 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 mb-8">
              <div className="flex flex-col items-center">
                <input type="number" id="send-limit-input" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} min={1} className="text-4xl font-black text-white bg-transparent border-b-4 border-indigo-400 focus:border-white outline-none w-32 text-center p-1 transition"/>
              </div>

              <div className="text-4xl font-light text-indigo-300">/</div>

              <div className="flex flex-col items-center">
                <span id="total-rows-limit-display" className="text-5xl font-black text-indigo-200">
                  {excelData.length}
                </span>
              </div>
            </div>

            {submitting ? (
              <div className="mb-10" id="progress-bar-container">
                <div className="flex justify-between text-white text-[10px] font-black uppercase mb-2">
                  <span id="send-status-text">Enviando... (Procesados: {send} de {cantidad})</span>
                  <span id="pct-display">{pct.toFixed(1)}%</span>
                </div>

                <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden border border-white/10 p-1">
                  <div id="send-progress" className="h-full bg-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.6)]" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}/>
                </div>
              </div>
            ) : null}

            <button id="start-send-btn" onClick={(e) => handleSubmit(e)} disabled={submitting || !validation.ok} className={`w-full py-5 rounded-2xl text-xl font-black transition flex items-center justify-center gap-3 bg-white text-indigo-700 hover:bg-slate-100 shadow-2xl shadow-indigo-900/40 active:scale-95 ${submitting || !validation.ok ? "opacity-60 cursor-not-allowed" : "" }`}>
              Envio de notificación
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
