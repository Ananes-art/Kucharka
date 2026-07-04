export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.floor(diff / 86400000);
}

// barevná třída podle blížící se expirace
export function expiryTone(days: number | null): { label: string; className: string } {
  if (days === null) return { label: "bez data", className: "bg-stone-100 text-stone-500" };
  if (days < 0) return { label: `prošlé (${-days} d)`, className: "bg-red-100 text-red-700" };
  if (days === 0) return { label: "dnes!", className: "bg-red-100 text-red-700" };
  if (days <= 2) return { label: `${days} d`, className: "bg-orange-100 text-orange-700" };
  if (days <= 5) return { label: `${days} d`, className: "bg-amber-100 text-amber-700" };
  return { label: `${days} d`, className: "bg-emerald-100 text-emerald-700" };
}

export function formatQty(quantity: number | null | undefined, unit: string | null | undefined): string {
  if (quantity == null) return "";
  const n = quantity.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
  return unit ? `${n} ${unit}` : n;
}
