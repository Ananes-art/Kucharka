import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Ingredient, BaseUnit } from "../api/types";
import { IconPlus, IconTrash } from "../components/Icons";

const BASE_UNITS: BaseUnit[] = ["g", "ml", "ks"];

export default function Ingredients() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("ks");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const list = useQuery({ queryKey: ["ingredients"], queryFn: () => api.get<Ingredient[]>("/ingredients") });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ingredients"] });

  const add = useMutation({
    mutationFn: () => api.post("/ingredients", { name: name.trim(), category: category.trim() || null, baseUnit }),
    onSuccess: () => {
      setName("");
      setCategory("");
      setError(null);
      invalidate();
    },
    onError: (e: any) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/ingredients/${id}`),
    onSuccess: invalidate,
    onError: (e: any) => alert(e.message),
  });

  const delAlias = useMutation({
    mutationFn: (aliasId: number) => api.del(`/ingredients/aliases/${aliasId}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-800">Suroviny (číselník)</h1>
      <p className="text-stone-500 text-sm">
        Jednotný seznam surovin. Aliasy jsou texty z účtenek, které se automaticky mapují na surovinu.
      </p>

      <div className="card p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="label">Název</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-36">
          <label className="label">Kategorie</label>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="w-24">
          <label className="label">Zákl. jedn.</label>
          <select className="input" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}>
            {BASE_UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <button onClick={() => add.mutate()} disabled={!name.trim()} className="btn-primary">
          <IconPlus className="w-4 h-4" /> Přidat
        </button>
      </div>
      {error && <div className="card px-4 py-2 text-sm text-red-700 bg-red-50 border-red-100">{error}</div>}

      <div className="card divide-y divide-stone-100">
        {list.data?.map((i) => (
          <div key={i.id}>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <button className="text-left min-w-0" onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                <div className="font-medium text-stone-800 flex items-center gap-2">
                  {i.name}
                  {i.inStock && <span className="chip bg-emerald-100 text-emerald-700">skladem</span>}
                </div>
                <div className="text-xs text-stone-500">
                  {i.category ?? "bez kategorie"} · {i.baseUnit}
                  {i.aliases && i.aliases.length > 0 && <> · {i.aliases.length} aliasů</>}
                </div>
              </button>
              <button onClick={() => remove.mutate(i.id)} className="text-stone-300 hover:text-red-500">
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
            {expanded === i.id && (
              <div className="px-4 pb-3 -mt-1">
                <div className="text-xs text-stone-500 mb-1">Názvy z účtenek (mapované na tuto surovinu):</div>
                {i.aliases && i.aliases.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {i.aliases.map((a) => (
                      <span key={a.id} className="chip bg-stone-100 text-stone-600" title={`klíč: ${a.keyword}`}>
                        {a.label}
                        <button onClick={() => delAlias.mutate(a.id)} className="text-stone-400 hover:text-red-500 ml-1">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-stone-400">Zatím žádné — vytvoří se při zpracování účtenky.</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
