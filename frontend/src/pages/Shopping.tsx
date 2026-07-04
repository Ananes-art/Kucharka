import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ShoppingItem } from "../api/types";
import { formatQty } from "../lib/format";
import { IconPlus, IconTrash } from "../components/Icons";

export default function Shopping() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const list = useQuery({ queryKey: ["shopping"], queryFn: () => api.get<ShoppingItem[]>("/shopping") });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["shopping"] });

  const add = useMutation({
    mutationFn: () => api.post("/shopping", { name: name.trim() }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });
  const check = useMutation({ mutationFn: (id: number) => api.post(`/shopping/${id}/check`), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.del(`/shopping/${id}`), onSuccess: invalidate });
  const clearChecked = useMutation({ mutationFn: () => api.del("/shopping"), onSuccess: invalidate });

  const items = list.data ?? [];
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Nákupní seznam</h1>
        {checkedCount > 0 && (
          <button onClick={() => clearChecked.mutate()} className="btn-ghost text-sm text-stone-500">
            Smazat koupené ({checkedCount})
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Přidat položku…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && add.mutate()}
        />
        <button onClick={() => add.mutate()} disabled={!name.trim()} className="btn-primary shrink-0">
          <IconPlus className="w-4 h-4" />
        </button>
      </div>

      {items.length > 0 ? (
        <div className="card divide-y divide-stone-100">
          {items.map((i) => (
            <div key={i.id} className="px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={i.checked}
                onChange={() => check.mutate(i.id)}
                className="w-5 h-5 rounded accent-brand-500"
              />
              <div className={`flex-1 min-w-0 ${i.checked ? "line-through text-stone-400" : ""}`}>
                <div className="font-medium text-stone-800">{i.name}</div>
                <div className="text-xs text-stone-500">
                  {formatQty(i.quantity, i.unit)}
                  {i.note && <> · {i.note}</>}
                </div>
              </div>
              <button onClick={() => remove.mutate(i.id)} className="text-stone-300 hover:text-red-500">
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card px-4 py-12 text-center text-stone-500">
          Seznam je prázdný. Přidejte položku nebo vygenerujte chybějící suroviny z receptu.
        </div>
      )}
    </div>
  );
}
