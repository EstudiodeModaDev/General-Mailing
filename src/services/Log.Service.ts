// src/services/ExcelAnyoneLink.service.ts
import { getAccessToken } from "../auth/msal";

/* =========================
   Tipos
   ========================= */
export type InsertRowsByAnyoneLinkParams = {
  anyoneEditLink: string;     // webUrl del link "Anyone can edit"
  rows: any[][];              // [ [col1, col2, ...], [col1, col2, ...] ]
  tableName?: string;         // si no se pasa, usa la primera tabla
  chunkSize?: number;         // default 200
  interactionMode?: "popup" | "redirect"; // default popup
};

type DriveItemFromShare = {
  id: string;
  parentReference?: { driveId?: string };
};

type TableInfo = { id: string; name: string };

/* =========================
   Utilidades
   ========================= */

/** Convierte webUrl -> shareId en formato "u!{base64url}" */
export function toShareIdFromUrl(webUrl: string): string {
  // base64 normal
  const b64 = btoa(unescape(encodeURIComponent(webUrl)));
  // base64url
  const b64url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `u!${b64url}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Fetch con retry básico para 429/503 */
async function graphFetch<T>(
  url: string,
  token: string,
  init?: RequestInit,
  retries = 4
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if ((res.status === 429 || res.status === 503) && retries > 0) {
    const ra = Number(res.headers.get("retry-after") ?? "0");
    const waitMs = ra > 0 ? ra * 1000 : (5 - retries) * 800;
    await sleep(waitMs);
    return graphFetch(url, token, init, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph error ${res.status} ${res.statusText}\n${text}`);
  }

  // Puede venir sin JSON en algunos casos; aquí esperamos JSON siempre.
  return (await res.json()) as T;
}

/* =========================
   Operaciones Graph
   ========================= */

/** Resuelve driveId + itemId desde un link "anyone edit" usando /shares/{shareId}/driveItem */
export async function resolveDriveItemFromAnyoneLink(
  anyoneEditLink: string,
  token: string
): Promise<{ driveId: string; itemId: string }> {
  const shareId = toShareIdFromUrl(anyoneEditLink);

  const driveItem = await graphFetch<DriveItemFromShare>(
    `https://graph.microsoft.com/v1.0/shares/${encodeURIComponent(shareId)}/driveItem`,
    token
  );

  const itemId = driveItem.id;
  const driveId = driveItem.parentReference?.driveId;

  if (!driveId || !itemId) {
    throw new Error("No se pudo resolver driveId/itemId desde el link (shares -> driveItem).");
  }

  return { driveId, itemId };
}

/** Lista tablas del workbook */
export async function listWorkbookTables(
  driveId: string,
  itemId: string,
  token: string
): Promise<TableInfo[]> {
  const data = await graphFetch<{ value: TableInfo[] }>(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(itemId)}/workbook/tables?$select=id,name`,
    token
  );
  return data.value ?? [];
}

/** Agrega filas a una tabla */
export async function addRowsToTable(
  driveId: string,
  itemId: string,
  tableName: string,
  rows: any[][],
  token: string
): Promise<void> {
  await graphFetch(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(itemId)}/workbook/tables/${encodeURIComponent(
      tableName
    )}/rows/add`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    }
  );
}

/* =========================
   API principal
   ========================= */

/**
 * Inserta filas a un Excel compartido por link "Anyone can edit".
 * - Usa MSAL (tu sesión ya autenticada) y pide Files.ReadWrite.All si hace falta.
 * - Resuelve driveId/itemId via /shares.
 * - Inserta por tabla (recomendado).
 */
export async function insertRowsByAnyoneLink(params: InsertRowsByAnyoneLinkParams): Promise<void> {
  const {
    anyoneEditLink,
    rows,
    tableName,
    chunkSize = 200,
    interactionMode = "popup",
  } = params;

  if (!anyoneEditLink?.trim()) throw new Error("anyoneEditLink es requerido.");
  if (!rows?.length) return;

  // 1) Token con permiso de escritura
  const token = await getAccessToken({
    interactionMode,
    silentExtraScopesToConsent: ["Sites.ReadWrite.All"],
  });

  // 2) Resolver item por link (/shares)
  const { driveId, itemId } = await resolveDriveItemFromAnyoneLink(anyoneEditLink, token);

  // 3) Determinar tabla
  const tables = await listWorkbookTables(driveId, itemId, token);
  if (!tables.length) {
    throw new Error("El Excel no tiene tablas. Crea una (Insert > Table) para poder insertar filas.");
  }

  const chosen =
    (tableName
      ? tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase())
      : undefined) ?? tables[0];

  // 4) Insertar en chunks
  const parts = chunkArray(rows, chunkSize);
  for (const part of parts) {
    await addRowsToTable(driveId, itemId, chosen.name, part, token);
  }
}
