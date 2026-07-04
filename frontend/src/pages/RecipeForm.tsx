import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Ingredient, Recipe, Unit } from "../api/types";
import { IconPlus, IconTrash, IconBack } from "../components/Icons";
import ComboBox from "../components/ComboBox";

const UNITS: Unit[] = ["g", "kg", "ml", "l", "ks"];

interface RowIng {
  ingredientId: number | "";
  quantity: string;
  unit: Unit;
  note: string;
}
interface RowStep {
  text: string;
}

export default function RecipeForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [servings, setServings] = useState("2");
  const [ings, setIngs] = useState<RowIng[]>([{ ingredientId: "", quantity: "", unit: "g", note: "" }]);
  const [steps, setSteps] = useState<RowStep[]>([{ text: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const catalog = useQuery({ queryKey: ["ingredients"], queryFn: () => api.get<Ingredient[]>("/ingredients") });

  const existing = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api.get<Recipe>(`/recipes/${id}`),
    enabled: editing,
  });

  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setTitle(r.title);
    setDescription(r.description ?? "");
    setCategory(r.category ?? "");
    setTags(r.tags.join(", "));
    setPrepMinutes(r.prepMinutes?.toString() ?? "");
    setServings(r.servings.toString());
    setIngs(
      (r.ingredients ?? []).map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity.toString(),
        unit: ri.unit,
        note: ri.note ?? "",
      }))
    );
    setSteps((r.steps ?? []).map((s) => ({ text: s.text })));
  }, [existing.data]);

  async function createIngredient() {
    const name = prompt("Název nové suroviny:");
    if (!name?.trim()) return;
    const baseUnit = (prompt("Základní jednotka (g / ml / ks):", "ks") ?? "ks").trim() as any;
    try {
      const created = await api.post<Ingredient>("/ingredients", { name: name.trim(), baseUnit });
      await qc.invalidateQueries({ queryKey: ["ingredients"] });
      return created.id;
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function submit() {
    setError(null);
    if (!title.trim()) return setError("Zadejte název receptu.");
    const validIngs = ings.filter((i) => i.ingredientId !== "" && i.quantity !== "");
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      prepMinutes: prepMinutes ? Number(prepMinutes) : null,
      servings: Number(servings) || 2,
      ingredients: validIngs.map((i) => ({
        ingredientId: Number(i.ingredientId),
        quantity: Number(i.quantity.replace(",", ".")),
        unit: i.unit,
        note: i.note.trim() || null,
      })),
      steps: steps
        .filter((s) => s.text.trim())
        .map((s, idx) => ({ order: idx + 1, text: s.text.trim() })),
    };
    setSaving(true);
    try {
      const saved = editing
        ? await api.put<Recipe>(`/recipes/${id}`, body)
        : await api.post<Recipe>("/recipes", body);
      if (imageFile) await api.upload(`/recipes/${saved.id}/image`, imageFile);
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      navigate(`/recepty/${saved.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <IconBack className="w-4 h-4" /> Zpět
      </button>
      <h1 className="text-2xl font-bold text-stone-800">{editing ? "Upravit recept" : "Nový recept"}</h1>

      {error && <div className="card px-4 py-3 text-sm text-red-700 bg-red-50 border-red-100">{error}</div>}

      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Název *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Krátký popis</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kategorie</label>
            <input className="input" placeholder="oběd, dezert…" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="label">Štítky (čárkou)</label>
            <input className="input" placeholder="rychlovka, veget…" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <label className="label">Doba přípravy (min)</label>
            <input className="input" type="number" value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)} />
          </div>
          <div>
            <label className="label">Počet porcí</label>
            <input className="input" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Hlavní obrázek</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
      </div>

      {/* suroviny */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">Suroviny</h2>
          <button onClick={createIngredient} className="btn-ghost text-brand-600 text-sm">
            <IconPlus className="w-4 h-4" /> Nová surovina do číselníku
          </button>
        </div>
        {ings.map((row, i) => (
          <div key={i} className="flex gap-2 items-start">
            <ComboBox
              className="flex-1"
              options={(catalog.data ?? []).map((ing) => ({ id: ing.id, name: ing.name, sub: ing.category }))}
              value={row.ingredientId}
              onChange={(id) => setIngs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ingredientId: id } : r)))}
            />
            <input
              className="input w-20"
              placeholder="množ."
              value={row.quantity}
              onChange={(e) => setIngs((prev) => prev.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
            />
            <select
              className="input w-20"
              value={row.unit}
              onChange={(e) => setIngs((prev) => prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value as Unit } : r)))}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIngs((prev) => prev.filter((_, idx) => idx !== i))}
              className="btn-ghost text-stone-400 px-2"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setIngs((prev) => [...prev, { ingredientId: "", quantity: "", unit: "g", note: "" }])}
          className="btn-outline w-full"
        >
          <IconPlus className="w-4 h-4" /> Přidat surovinu
        </button>
      </div>

      {/* postup */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-stone-800">Postup</h2>
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="shrink-0 w-7 h-7 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-sm font-semibold mt-1">
              {i + 1}
            </span>
            <textarea
              className="input"
              rows={2}
              placeholder={`Krok ${i + 1}…`}
              value={s.text}
              onChange={(e) => setSteps((prev) => prev.map((r, idx) => (idx === i ? { text: e.target.value } : r)))}
            />
            <button onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))} className="btn-ghost text-stone-400 px-2 mt-1">
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setSteps((prev) => [...prev, { text: "" }])} className="btn-outline w-full">
          <IconPlus className="w-4 h-4" /> Přidat krok
        </button>
      </div>

      <div className="flex gap-2 sticky bottom-20 md:bottom-4">
        <button onClick={submit} disabled={saving} className="btn-primary flex-1">
          {saving ? "Ukládám…" : "Uložit recept"}
        </button>
      </div>
    </div>
  );
}
