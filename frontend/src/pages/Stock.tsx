import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Ingredient, StockItem, Unit } from "../api/types";
import { daysUntil, expiryTone, formatQty, formatDate } from "../lib/format";
import { IconPlus, IconTrash } from "../components/Icons";
import ComboBox from "../components/ComboBox";

const UNITS: Unit[] = ["g", "kg", "ml", "l", "ks"];

export default function Stock() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ingredientId, setIngredientId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("ks");
  const [expiry, setExpiry] = useState("");

  const stock = useQuery({ queryKey: ["stock"], queryFn: () => api.get<StockItem[]>("/stock") });
  const catalog = useQuery({ queryKey: ["ingredients"], queryFn: () => api.get<Ingredient[]>("/ingredients") });

  const add = useMutation({
    mutationFn: () =>
      api.post("/stock", {
        ingredientId: Number(ingredientId),
        quantity: Number(quantity.replace(",", ".")),
        unit,
        expiryDate: expiry ? new Date(expiry).toISOString() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      setOpen(false);
      setIngredientId("");
      setQuantity("");
      setExpiry("");
    },
  });

  const remove = useMutation({
    mutationFn: (sid: number) => api.del(`/stock/${sid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Sklad</h1>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary">
          <IconPlus className="w-4 h-4" /> Přidat
        </button>
      </div>

      {open && (
        <div className="card p-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Surovina (piš pro hledání)</label>
            <ComboBox
              options={(catalog.data ?? []).map((i) => ({ id: i.id, name: i.name, sub: i.category }))}
              value={ingredientId}
              onChange={(id) => setIngredientId(id)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Množství</label>
              <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="w-24">
              <label className="label">Jednotka</label>
              <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Datum spotřeby</label>
            <input type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button onClick={() => add.mutate()} disabled={ingredientId === "" || !quantity} className="btn-primary w-full">
              Uložit do skladu
            </button>
          </div>
        </div>
      )}

      {stock.isLoading ? (
        <div className="card h-40 animate-pulse bg-stone-100" />
      ) : stock.data && stock.data.length > 0 ? (
        <div className="card divide-y divide-stone-100">
          {stock.data.map((s) => {
            const d = daysUntil(s.expiryDate);
            const tone = expiryTone(d);
            return (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-stone-800">{s.ingredient.name}</div>
                  <div className="text-xs text-stone-500">
                    {formatQty(s.quantity, s.unit)}
                    {s.expiryDate && <> · spotřebovat do {formatDate(s.expiryDate)}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${tone.className}`}>{tone.label}</span>
                  <button onClick={() => remove.mutate(s.id)} className="text-stone-300 hover:text-red-500">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card px-4 py-12 text-center text-stone-500">Sklad je prázdný. Naskladněte z účtenky nebo ručně.</div>
      )}
    </div>
  );
}
