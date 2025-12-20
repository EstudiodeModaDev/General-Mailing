import * as React from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  imageSize?: { width: number; height?: number; fit?: "contain" | "cover" };
  editorRef?: React.RefObject<HTMLDivElement | null>;
};

type BlockType = "p" | "h1" | "h2";

export default function RichTextBase64TW({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  readOnly,
  className = "",
  imageSize = { width: 480 },
  editorRef,
}: Props) {
  const internalRef = React.useRef<HTMLDivElement>(null);

  const elRef = React.useMemo(() => {
    return (editorRef as React.RefObject<HTMLDivElement>) ?? internalRef;
  }, [editorRef]);

  const [hasFocus, setHasFocus] = React.useState(false);
  const [block, setBlock] = React.useState<BlockType>("p");

  // Sincroniza HTML externo → editor
  React.useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (el.innerHTML !== (value || "")) el.innerHTML = value || "";
  }, [value, elRef]);

  const emitChange = React.useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange, elRef]);

  const isSelectionInsideEditor = React.useCallback(() => {
    const el = elRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return false;
    return el.contains(sel.anchorNode);
  }, [elRef]);

  const placeCaretAtEnd = (el: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const buildImgHTML = (src: string) => {
    const w = imageSize.width;
    const h = imageSize.height;
    const fit = imageSize.fit ?? "contain";

    if (h) {
      return `<img src="${src}" width="${w}" height="${h}" style="display:block; object-fit:${fit}; max-width:100%; width:${w}px; height:${h}px;" />`;
    }
    return `<img src="${src}" width="${w}" style="display:block; object-fit:${fit}; max-width:100%; width:${w}px; height:auto;" />`;
  };

  const insertHTMLAtCursor = (html: string) => {
    const el = elRef.current;
    if (!el) return;

    if (!isSelectionInsideEditor()) {
      if (!hasFocus) return;
      el.focus();
      placeCaretAtEnd(el);
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const lastNode = frag.lastChild;
    range.insertNode(frag);

    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    if (!isSelectionInsideEditor()) return;
    if (!e.clipboardData) return;

    const files: File[] = [];
    for (const item of e.clipboardData.items) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f && f.type.startsWith("image/")) files.push(f);
      }
    }
    if (!files.length) return;

    e.preventDefault();
    for (const file of files) {
      const dataUrl = await fileToDataURL(file);
      insertHTMLAtCursor(buildImgHTML(dataUrl));
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    if (!isSelectionInsideEditor()) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    for (const f of imgs) {
      const dataUrl = await fileToDataURL(f);
      insertHTMLAtCursor(buildImgHTML(dataUrl));
    }
  };

  const preventDefault: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();

  const cmd = (command: string, valueCmd?: string) => {
    if (!isSelectionInsideEditor()) return;
    document.execCommand(command, false, valueCmd);
    emitChange();
  };

  const setFormat = (b: BlockType) => {
    // en execCommand: "formatBlock" recibe tag name
    const tag = b === "p" ? "P" : b.toUpperCase();
    cmd("formatBlock", tag);
    setBlock(b);
  };

  const Toolbar = React.useMemo(() => {
    const disabled = !!readOnly;

    const btnBase =
      "h-6 w-6 inline-flex items-center justify-center rounded-lg transition select-none";
    const btn =
      btnBase +
      (disabled
        ? " text-slate-300 cursor-not-allowed"
        : " text-slate-600 hover:bg-slate-100 active:bg-slate-200");

    const prevent = (e: React.MouseEvent | React.PointerEvent) => e.preventDefault();

    return (
      <div className="flex items-center gap-0 px-3 h-12 border-b border-slate-200 bg-white rounded-t-2xl">
        {/* Select "Normal" */}
        <div className="pr-2 mr-2 border-r border-slate-200">
          <select
            value={block}
            disabled={disabled}
            onChange={(e) => setFormat(e.target.value as BlockType)}
            className={[
              "h-9 px-3 rounded-lg text-sm font-medium bg-white outline-none",
              "border border-transparent",
              disabled
                ? "text-slate-300"
                : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-100",
            ].join(" ")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <option value="p">Normal</option>
            <option value="h1">Título 1</option>
            <option value="h2">Título 2</option>
          </select>
        </div>

        {/* B I U S */}
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("bold")} title="Negrita">
          <span className="font-black">B</span>
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("italic")} title="Cursiva">
          <span className="italic font-semibold">I</span>
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("underline")} title="Subrayado">
          <span className="underline font-semibold">U</span>
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("strikeThrough")} title="Tachado">
          <span className="line-through font-semibold">S</span>
        </button>

        {/* Image */}
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onMouseDown={prevent}
          onPointerDown={prevent}
          onClick={async () => {
            if (!isSelectionInsideEditor()) return;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const f = input.files?.[0];
              if (!f) return;
              const dataUrl = await fileToDataURL(f);
              insertHTMLAtCursor(buildImgHTML(dataUrl));
            };
            input.click();
          }}
          title="Imagen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512"><path fill="#4b4949" d="m349.1 140.6l-69.8 139.6l-46.5-46.5l-46.5 46.5l-46.5-46.5l-46.7 139.7h325.8l-69.8-232.8zM0 1v512h512V1H0zm465.5 418.9h-419V47.5h418.9v372.4zM139.6 187.2c25.7 0 46.5-20.9 46.5-46.5c0-25.7-20.9-46.5-46.5-46.5S93.1 115 93.1 140.6c0 25.7 20.8 46.6 46.5 46.6z"/></svg>
        </button>

        {/* Lists */}
        <div className="w-px h-6 bg-slate-200 mx-2" />
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("insertOrderedList")} title="Lista numerada">
          1≡
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("insertUnorderedList")} title="Lista con viñetas">
          •≡
        </button>

        {/* Clear */}
        <div className="w-px h-6 bg-slate-200 mx-2" />
        <button type="button" className={btn} disabled={disabled} onMouseDown={prevent} onPointerDown={prevent} onClick={() => cmd("removeFormat")} title="Limpiar formato">
          Tˣ
        </button>
      </div>
    );
  }, [readOnly, block, isSelectionInsideEditor, emitChange]);

  return (
    <div className={`w-full ${className}`}>
      {/* Card container como la imagen */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!readOnly && Toolbar}

        <div
          ref={elRef}
          className={[
            "min-h-[560px] w-full bg-white px-6 py-5",
            "text-slate-800 text-[16px] leading-relaxed",
            "outline-none",
            // links / img / listas
            "[&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-indigo-200 hover:[&_a]:decoration-indigo-400",
            "[&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:my-3",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
          ].join(" ")}
          contentEditable={!readOnly}
          onInput={emitChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={preventDefault}
          onDragEnter={preventDefault}
          onDragLeave={preventDefault}
          onFocus={() => setHasFocus(true)}
          onBlur={() => setHasFocus(false)}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </div>

      {/* Placeholder visual como editor grande vacío */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before{
          content: attr(data-placeholder);
          color: #94a3b8;
          font-weight: 500;
          pointer-events: none;
        }
        /* Evita que el borde azul feo aparezca en algunos browsers */
        [contenteditable]:focus { outline: none; }
      `}</style>
    </div>
  );
}
