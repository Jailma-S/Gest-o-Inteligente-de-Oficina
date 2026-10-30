/** Parser CSV simples com aspas. Detecta ";" (padrão do Excel em pt-BR) ou ",". */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function parseBoolean(value: string | undefined): boolean {
  return ["S", "SIM", "Y", "YES", "TRUE", "1", "X"].includes(normalizeKey(value ?? ""));
}

export function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number(value.trim().replace(/\./g, (m, offset, s) => (s.includes(",") ? "" : m)).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Aceita ISO (2026-10-30T14:00) ou dd/mm/aaaa [hh:mm]. */
export function parseDate(value: string | undefined): Date | null | "invalid" {
  const v = value?.trim();
  if (!v) return null;
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  const date = br
    ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] ?? 18), Number(br[5] ?? 0))
    : new Date(v);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}
