import * as React from "react";
import RichTextBase64TW from "../RichText/RichText";

/* =========================
   Tipos
   ========================= */
type Step2DesignerProps = {
  varKeys: string[];
  subject?: string;
  html?: string;
  onBack?: () => void;
  onNext?: () => void;
  onSubjectChange?: (value: string) => void;
  onHtmlChange?: (value: string) => void;
  onInsertVariable?: (variable: string) => void;
  onOpenPreview?: () => void;
};

type MaskedLinkModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (args: { text: string; urlOrVar: string }) => void;
};

/* =========================
   Utils: insertar en input (asunto)
   ========================= */
function insertTextAtCursor(input: HTMLInputElement, text: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const val = input.value;
  input.value = val.slice(0, start) + text + val.slice(end);
  const newPos = start + text.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* =========================
   Utils: insertar HTML en contentEditable (RichText)
   ========================= */
type FocusTarget = "subject" | "editor" | null;



export function insertHTMLAtCursorEditable(editorEl: HTMLElement, html: string) {
  editorEl.focus();

  const sel = window.getSelection();
  if (!sel) return;

  // Si no hay selección dentro del editor, crea un rango al final
  if (sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode)) {
    const range = document.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const frag = range.createContextualFragment(html);
  const lastNode = frag.lastChild;

  range.insertNode(frag);

  // mueve el caret al final de lo insertado
  if (lastNode) {
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  // dispara input para que onChange lea el HTML
  editorEl.dispatchEvent(new Event("input", { bubbles: true }));
}

export function insertTextAtCursorEditable(editorEl: HTMLElement, text: string) {
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  insertHTMLAtCursorEditable(editorEl, safe);
}

/* =========================
   Modal (solo visual + input)
   ========================= */
const MaskedLinkModal: React.FC<MaskedLinkModalProps> = ({ open, onClose, onConfirm }) => {
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setText("");
      setUrl("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 modal-backdrop">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 border border-slate-200">
        <h3 className="text-2xl font-black text-slate-800 mb-8">Vincular Texto</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"> Texto Visible</label>
            <input value={text} onChange={(e) => setText(e.target.value)}  className="w-full px-5 py-3 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-50 shadow-sm outline-none transition" placeholder="Ej: carta de su pedido" autoFocus/>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección URL o Variable</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-5 py-3 border border-slate-200 rounded-xl font-mono text-xs focus:ring-4 focus:ring-indigo-50 shadow-sm outline-none transition" placeholder="https://drive..."/>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-10">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl">
            Cancelar
          </button>
          <button type="button" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-100" onClick={() => { 
                                                                                                                                                                    if (!text.trim() || !url.trim()) return;
                                                                                                                                                                    onConfirm({ text: text.trim(), urlOrVar: url.trim() });
                                                                                                                                                                  }}>
            Crear Vínculo
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Step2Designer
   ========================= */
export const Step2Designer: React.FC<Step2DesignerProps> = ({varKeys, subject: subjectProp, html: htmlProp, onBack, onNext, onSubjectChange, onHtmlChange, onInsertVariable,}) => {
  const [subjectLocal, setSubjectLocal] = React.useState(subjectProp ?? "");
  const [htmlLocal, setHtmlLocal] = React.useState(htmlProp ?? "");
  const [linkOpen, setLinkOpen] = React.useState(false);
  

  const subject = subjectProp ?? subjectLocal;
  const html = htmlProp ?? htmlLocal;

  const subjectRef = React.useRef<HTMLInputElement | null>(null);
  const rteRef = React.useRef<HTMLDivElement | null>(null);

  const lastFocusRef = React.useRef<FocusTarget>(null);

  React.useEffect(() => {
    if (subjectProp !== undefined) setSubjectLocal(subjectProp);
  }, [subjectProp]);

  React.useEffect(() => {
    if (htmlProp !== undefined) setHtmlLocal(htmlProp);
  }, [htmlProp]);

  React.useEffect(() => {
    const el = rteRef.current;
    if (!el) return;

    const onFocusIn = () => {
      lastFocusRef.current = "editor";
    };

    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);

  const setSubject = (v: string) => {
    if (subjectProp === undefined) setSubjectLocal(v);
    onSubjectChange?.(v);
  };

  const setHtml = (v: string) => {
    if (htmlProp === undefined) setHtmlLocal(v);
    onHtmlChange?.(v);
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    onInsertVariable?.(token);

    const subjectEl = subjectRef.current;
    const editorEl = rteRef.current;
    const sel = window.getSelection();

    /* 1️⃣ Si el caret está realmente dentro del editor */
    if (
      editorEl &&
      sel?.anchorNode &&
      editorEl.contains(sel.anchorNode)
    ) {
      insertTextAtCursorEditable(editorEl, token);
      setHtml(editorEl.innerHTML);
      lastFocusRef.current = "editor";
      return;
    }

    /* 2️⃣ Si el foco actual es el subject */
    if (subjectEl && document.activeElement === subjectEl) {
      insertTextAtCursor(subjectEl, token);
      setSubject(subjectEl.value);
      lastFocusRef.current = "subject";
      return;
    }

    /* 3️⃣ Si venimos de un modal / toolbar → último foco */
    if (lastFocusRef.current === "editor" && editorEl) {
      insertTextAtCursorEditable(editorEl, token);
      setHtml(editorEl.innerHTML);
      return;
    }

    if (lastFocusRef.current === "subject" && subjectEl) {
      insertTextAtCursor(subjectEl, token);
      setSubject(subjectEl.value);
      return;
    }

    /* 4️⃣ Fallback seguro */
    setHtml(html + token);
  };


  return (
    <section id="view-step-2" className="step-view fade-in flex-grow flex flex-col h-full">
      <div className="designer-canvas flex-grow flex flex-col">
        {/* Top bar */}
        <div className="mb-8 flex flex-grow fex flex-col">
          <div className="flex items-end justify-between border-b border-slate-200 pb-4">
            <div className="flex-grow max-w-2xl">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Asunto del correo</label>
              <input onFocus={() => lastFocusRef.current = "subject"} ref={subjectRef} value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-800 placeholder:text-slate-300" placeholder="Ej: Confirmación del pedido {{pedido_id}}"/>
            </div>   
            <div className="flex gap-3">
              <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition">Atrás</button>
              <button type="button" onClick={onNext} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
                Configurar envio
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-16">Variables:</span>
              <div id="variable-chips" className="flex flex-wrap gap-2">
                {varKeys.map((k) => (
                  <button key={k} className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md border border-indigo-100 hover:bg-indigo-600 hover:text-white transition shadow-sm active:scale-95" title={k} type="button" onMouseDown={(e) => {
                                                                                                                                                                                                                                                                                e.preventDefault();
                                                                                                                                                                                                                                                                                insertVariable(k);
                                                                                                                                                                                                                                                                              }}>
                    {`{{${k}}}`}
                  </button>
                ))}
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <button id="add-masked-link" onClick={() => setLinkOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-900 transition flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
                Vincular Texto
              </button>
          </div>
        </div>

        <div className="quill-editor-area flex-grow mt-3">
          <RichTextBase64TW value={html} onChange={setHtml} editorRef={rteRef}/>
        </div>
      </div>

      <MaskedLinkModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onConfirm={({ text, urlOrVar }) => {
          const aTag = `<a href="${urlOrVar}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          const editorEl = rteRef.current;

          if (editorEl) {
            // ✅ Inserta donde está el caret dentro del editor
            insertHTMLAtCursorEditable(editorEl, aTag);
            setHtml(editorEl.innerHTML);
          } else {
            // fallback: concat al final
            setHtml(html+ aTag);
          }

          setLinkOpen(false);
        }}
      />
    </section>



  );
};
