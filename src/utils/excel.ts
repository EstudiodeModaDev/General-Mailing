// src/utils/exportExcel.ts
import * as XLSX from "xlsx";
import type { Log } from "../components/Envio/Send";
import { formatFecha } from "./date";

export function exportLogToExcel(rows: Log[], opts?: { fileName?: string }) {
  // 1) Mapeas tus rows al formato que quieres en el Excel
  const data = rows.map(row => ({
    "Fecha y hora de envio": formatFecha(row.fecha.toISOString()),
    "Destinatario": row.correo,
    "Asunto": row.asunto,
    "Estado": row.estado
  }));

  // 2) Crear hoja a partir de JSON
  const ws = XLSX.utils.json_to_sheet(data);

  // 3) Crear libro y anexar hoja
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Envios");

  // 4) Descargar archivo
  const fileName = opts?.fileName ?? "ReporteEnvios.xlsx";
  XLSX.writeFile(wb, fileName);
}



