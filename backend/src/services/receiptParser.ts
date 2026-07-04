import { normalize } from "../lib/text.js";

export interface ParsedLine {
  rawText: string;
  keyword: string;
  quantity: number | null;
  unit: string | null;
  price: number | null;
}

export interface ParsedReceipt {
  store: string | null;
  purchasedAt: Date | null;
  total: number | null;
  lines: ParsedLine[];
}

const KNOWN_STORES = [
  "kaufland", "lidl", "albert", "billa", "tesco", "penny", "globus", "makro",
  "rohlik", "kosik", "coop", "flop", "norma",
];

// Slova, která nejsou surovina (přeskočíme automaticky, ale necháme uživateli).
const NOISE = [
  "celkem", "suma", "k platbe", "k úhrade", "hotovost", "karta", "dph", "zaokrouhleni",
  "dan", "sazba", "zaklad", "vratime", "prijato", "castka", "bonus", "sleva",
  "eur", "kč", "kc", "www", "ico", "dic", "provozovna", "pokladna", "uctenka",
  "danovy doklad", "platba", "celkova",
];

const priceRe = /(\d{1,4}[.,]\d{2})\s*[A-D]?\s*$/; // cena na konci řádku
const qtyRe = /(\d+(?:[.,]\d+)?)\s*(kg|g|ks|ml|l|x)\b/i;
const dateRe = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/;

function toNum(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", "."));
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let store: string | null = null;
  let total: number | null = null;
  let purchasedAt: Date | null = null;

  for (const line of rawLines.slice(0, 8)) {
    const n = normalize(line);
    const hit = KNOWN_STORES.find((s) => n.includes(s));
    if (hit && !store) store = hit.charAt(0).toUpperCase() + hit.slice(1);
  }

  for (const line of rawLines) {
    const n = normalize(line);
    if (!purchasedAt) {
      const d = line.match(dateRe);
      if (d) {
        let year = Number(d[3]);
        if (year < 100) year += 2000;
        const dt = new Date(year, Number(d[2]) - 1, Number(d[1]));
        if (!isNaN(dt.getTime())) purchasedAt = dt;
      }
    }
    if (/(celkem|k platbe|k úhrade|k uhrade|suma)/.test(n)) {
      const p = line.match(/(\d{1,5}[.,]\d{2})/);
      if (p) total = toNum(p[1]);
    }
  }

  const lines: ParsedLine[] = [];
  for (const line of rawLines) {
    const n = normalize(line);
    if (NOISE.some((w) => n.includes(w))) continue;

    const priceMatch = line.match(priceRe);
    // Řádek považujeme za položku, pokud obsahuje cenu a nějaká písmena (název).
    const hasLetters = /[a-zá-ž]{3,}/i.test(line);
    if (!priceMatch || !hasLetters) continue;

    const price = toNum(priceMatch[1]);

    // množství + jednotka
    let quantity: number | null = null;
    let unit: string | null = null;
    const q = line.match(qtyRe);
    if (q) {
      quantity = toNum(q[1]);
      const u = q[2].toLowerCase();
      unit = u === "x" ? "ks" : u;
    }

    // název = řádek bez ceny a bez množstevního ocásku
    let name = line
      .replace(priceRe, "")
      .replace(/\d+(?:[.,]\d+)?\s*(kg|g|ks|ml|l)\b/gi, "")
      .replace(/\d+(?:[.,]\d+)?\s*x/gi, "")
      .replace(/[*#>|]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // odstraníme koncové kódy (např. jednopísmenná DPH sazba)
    name = name.replace(/\s+[A-D]$/, "").trim();

    if (name.length < 2) continue;

    lines.push({
      rawText: line,
      keyword: normalize(name),
      quantity,
      unit,
      price,
    });
  }

  return { store, purchasedAt, total, lines };
}
