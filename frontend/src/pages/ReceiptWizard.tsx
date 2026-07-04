import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Ingredient, Receipt, Unit, BaseUnit } from "../api/types";
import { IconBack } from "../components/Icons";
import ComboBox from "../components/ComboBox";

const UNITS: Unit[] = ["g", "kg", "ml", "l", "ks"];
const BASE_UNITS: BaseUnit[] = ["g", "ml", "ks"];

interface Decision {
  lineId: number;
  mode: "existing" | "new" | "ignore";
  ingredientId: number | "";
  newName: string;
  newBaseUnit: BaseUnit;
  quantity: string;
  unit: Unit;
  expiry: string;
}

export default function ReceiptWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [done, setDone] = useState<{ added: number; removed: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const catalog = useQuery({ queryKey: ["ingredients"], queryFn: () => api.get<Ingredient[]>("/ingredients") });
  const receipt = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => api.get<Receipt>(`/receipts/${id}`),
  });

  // pouze nezpracované řádky
  const lines = useMemo(() => receipt.data?.lines.filter((l) => !l.processed && !l.ignored) ?? [], [receipt.data]);

  function decisionFor(lineId: number): Decision {
    const existing = decisions[lineId];
    if (existing) return existing;
    const line = lines.find((l) => l.id === lineId)!;
    const sug = line.suggestion;
    const d: Decision = {
      lineId,
      mode: sug?.ingredientId ? "existing" : "new",
      ingredientId: sug?.ingredientId ?? "",
      newName: capitalize(line.keyword),
      newBaseUnit: "ks",
      quantity: line.quantity != null ? String(line.quantity) : "1",
      unit: (line.unit as Unit) ?? "ks",
      expiry: "",
    };
    return d;
  }

  function update(lineId: number, patch: Partial<Decision>) {
    setDecisions((prev) => ({ ...prev, [lineId]: { ...decisionFor(lineId), ...patch } }));
  }

  async function confirm() {
    setSubmitting(true);
    try {
      const payload = {
        lines: lines.map((l) => {
          const d = decisionFor(l.id);
          if (d.mode === "ignore") return { lineId: l.id, action: "ignore" as const, saveAlias: false };
          const common = {
            lineId: l.id,
            saveAlias: true,
            aliasLabel: l.rawText,
            quantity: Number(d.quantity.replace(",", ".")) || 1,
            unit: d.unit,
            expiryDate: d.expiry ? new Date(d.expiry).toISOString() : null,
          };
          if (d.mode === "new") {
            return { ...common, action: "create" as const, newIngredient: { name: d.newName.trim(), baseUnit: d.newBaseUnit } };
          }
          return { ...common, action: "assign" as const, ingredientId: Number(d.ingredientId) };
        }),
      };
      const res = await api.post<{ added: number; removedFromShopping: number }>(`/receipts/${id}/confirm`, payload);
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["shopping"] });
      setDone({ added: res.added, removed: res.removedFromShopping });
    } catch (e: any) {
      alert("Uložení selhalo: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt.isLoading || catalog.isLoading) return <div className="card h-64 animate-pulse bg-stone-100" />;

  if (done !== null) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-10">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-stone-800">Naskladněno</h1>
        <p className="text-stone-500">
          Do skladu přibylo {done.added} položek.
          {done.removed > 0 && <> Z nákupního seznamu odebráno {done.removed} koupených položek.</>}
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate("/sklad")} className="btn-primary">
            Zobrazit sklad
          </button>
          <button onClick={() => navigate("/uctenka")} className="btn-outline">
            Účtenky
          </button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-10">
        <div className="text-5xl">🧾</div>
        <p className="text-stone-500">Na této účtence nejsou žádné nezpracované položky.</p>
        <button onClick={() => navigate("/uctenka")} className="btn-outline">
          Zpět na účtenky
        </button>
      </div>
    );
  }

  const line = lines[index];
  const d = decisionFor(line.id);
  const isLast = index === lines.length - 1;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={() => navigate("/uctenka")} className="btn-ghost -ml-2">
        <IconBack className="w-4 h-4" /> Účtenky
      </button>

      {/* progres */}
      <div>
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>
            Položka {index + 1} z {lines.length}
          </span>
          <span>{receipt.data?.store ?? "Účtenka"}</span>
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((index + 1) / lines.length) * 100}%` }} />
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <div className="text-xs text-stone-400">Z účtenky</div>
          <div className="font-mono text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 mt-1">{line.rawText}</div>
          {line.suggestion?.name && (
            <div className="text-xs text-emerald-600 mt-1">
              Návrh: {line.suggestion.name} {line.suggestion.source === "alias" ? "(dle aliasu)" : "(podobnost)"}
            </div>
          )}
        </div>

        {/* volba režimu */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 text-sm">
          {(["existing", "new", "ignore"] as const).map((m) => (
            <button
              key={m}
              onClick={() => update(line.id, { mode: m })}
              className={`flex-1 rounded-lg py-1.5 font-medium transition ${
                d.mode === m ? "bg-white shadow-sm text-stone-800" : "text-stone-500"
              }`}
            >
              {m === "existing" ? "Z číselníku" : m === "new" ? "Nová" : "Přeskočit"}
            </button>
          ))}
        </div>

        {d.mode === "existing" && (
          <div>
            <label className="label">Surovina z číselníku (piš pro hledání)</label>
            <ComboBox
              options={(catalog.data ?? []).map((i) => ({ id: i.id, name: i.name, sub: i.category }))}
              value={d.ingredientId}
              onChange={(id) => update(line.id, { ingredientId: id })}
            />
          </div>
        )}

        {d.mode === "new" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="label">Název suroviny</label>
              <input className="input" value={d.newName} onChange={(e) => update(line.id, { newName: e.target.value })} />
            </div>
            <div>
              <label className="label">Zákl. jedn.</label>
              <select className="input" value={d.newBaseUnit} onChange={(e) => update(line.id, { newBaseUnit: e.target.value as BaseUnit })}>
                {BASE_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {d.mode !== "ignore" && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Množství</label>
                <input className="input" value={d.quantity} onChange={(e) => update(line.id, { quantity: e.target.value })} />
              </div>
              <div className="w-24">
                <label className="label">Jednotka</label>
                <select className="input" value={d.unit} onChange={(e) => update(line.id, { unit: e.target.value as Unit })}>
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Datum spotřeby</label>
              <input type="date" className="input" value={d.expiry} onChange={(e) => update(line.id, { expiry: e.target.value })} />
            </div>
          </>
        )}
      </div>

      {/* navigace */}
      <div className="flex gap-2">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="btn-outline">
          Zpět
        </button>
        {isLast ? (
          <button onClick={confirm} disabled={submitting} className="btn-primary flex-1">
            {submitting ? "Ukládám…" : "Dokončit a naskladnit"}
          </button>
        ) : (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-primary flex-1">
            Další položka
          </button>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
