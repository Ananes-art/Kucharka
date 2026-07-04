// Jednotky a přepočty na základní jednotku suroviny (g | ml | ks)

export type BaseUnit = "g" | "ml" | "ks";
export const UNITS = ["g", "kg", "ml", "l", "ks"] as const;
export type Unit = (typeof UNITS)[number];

// Přepočet libovolné jednotky na základní jednotku dané suroviny.
// Vrací null, pokud jsou jednotky nekompatibilní (nelze porovnat).
export function toBase(quantity: number, unit: string, baseUnit: string): number | null {
  const u = (unit ?? "").toLowerCase();
  const b = (baseUnit ?? "ks").toLowerCase();

  if (b === "g") {
    if (u === "g") return quantity;
    if (u === "kg") return quantity * 1000;
    return null;
  }
  if (b === "ml") {
    if (u === "ml") return quantity;
    if (u === "l") return quantity * 1000;
    return null;
  }
  // ks
  if (u === "ks" || u === "") return quantity;
  return null;
}

// Hezký zápis množství v základní jednotce (např. 1500 g -> "1,5 kg")
export function formatBase(amount: number, baseUnit: string): string {
  const b = (baseUnit ?? "ks").toLowerCase();
  const fmt = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
  if (b === "g") return amount >= 1000 ? `${fmt(amount / 1000)} kg` : `${fmt(amount)} g`;
  if (b === "ml") return amount >= 1000 ? `${fmt(amount / 1000)} l` : `${fmt(amount)} ml`;
  return `${fmt(amount)} ks`;
}
