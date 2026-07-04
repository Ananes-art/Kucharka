// Normalizace textu z účtenky: lowercase, bez diakritiky, sjednocené mezery
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Jednoduchá podobnost dvou řetězců (Dice koeficient bigramů) 0..1
export function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const res = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      res.set(bg, (res.get(bg) ?? 0) + 1);
    }
    return res;
  };
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [bg, count] of A) {
    if (B.has(bg)) overlap += Math.min(count, B.get(bg)!);
  }
  const total = [...A.values()].reduce((s, n) => s + n, 0) + [...B.values()].reduce((s, n) => s + n, 0);
  return (2 * overlap) / total;
}
