// Fuzzy vyhledávání pro select lookup (bez závislostí).

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const res = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    res.set(bg, (res.get(bg) ?? 0) + 1);
  }
  return res;
}

// Dice koeficient 0..1
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [bg, count] of A) if (B.has(bg)) overlap += Math.min(count, B.get(bg)!);
  const total = [...A.values()].reduce((s, n) => s + n, 0) + [...B.values()].reduce((s, n) => s + n, 0);
  return (2 * overlap) / total;
}

export interface Ranked<T> {
  item: T;
  score: number;
}

// Seřadí položky podle relevance k dotazu. Prázdný dotaz = původní pořadí.
export function rank<T>(items: T[], query: string, getText: (t: T) => string): T[] {
  const q = normalize(query);
  if (!q) return items;
  const scored: Ranked<T>[] = items.map((item) => {
    const text = normalize(getText(item));
    let score = similarity(q, text);
    if (text.startsWith(q)) score += 1; // prefix má přednost
    else if (text.includes(q)) score += 0.5; // substring bonus
    return { item, score };
  });
  return scored
    .filter((s) => s.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}
