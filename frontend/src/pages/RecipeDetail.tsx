import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import type { Recipe } from "../api/types";
import { formatQty, formatDate } from "../lib/format";
import { IconStar, IconClock, IconTrash, IconBack, IconCart } from "../components/Icons";

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api.get<Recipe>(`/recipes/${id}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["recipe", id] });

  const favorite = useMutation({
    mutationFn: () => api.post(`/recipes/${id}/favorite`),
    onSuccess: invalidate,
  });
  const rate = useMutation({
    mutationFn: (rating: number) => api.post(`/recipes/${id}/rating`, { rating }),
    onSuccess: invalidate,
  });
  const addComment = useMutation({
    mutationFn: () => api.post(`/recipes/${id}/comments`, { text: comment }),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
  });
  const delComment = useMutation({
    mutationFn: (cid: number) => api.del(`/recipes/comments/${cid}`),
    onSuccess: invalidate,
  });
  const genShopping = useMutation({
    mutationFn: () => api.post<{ added: number }>(`/recipes/${id}/shopping-list`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["shopping"] });
      setMsg(r.added > 0 ? `Přidáno ${r.added} položek do nákupního seznamu.` : "Máte doma vše potřebné 🎉");
    },
    onError: (e: any) => setMsg("Nepodařilo se vygenerovat nákup: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/recipes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      navigate("/recepty");
    },
  });

  if (isLoading || !recipe) return <div className="card h-64 animate-pulse bg-stone-100" />;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <IconBack className="w-4 h-4" /> Zpět
      </button>

      {recipe.mainImage && (
        <img src={uploadUrl(recipe.mainImage)} alt="" className="w-full h-56 md:h-72 object-cover rounded-2xl" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{recipe.title}</h1>
          {recipe.description && <p className="text-stone-500 mt-1">{recipe.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
            {recipe.prepMinutes && (
              <span className="inline-flex items-center gap-1">
                <IconClock className="w-4 h-4" /> {recipe.prepMinutes} min
              </span>
            )}
            <span>{recipe.servings} porce</span>
            {recipe.category && <span className="chip bg-stone-100 text-stone-600">{recipe.category}</span>}
            {recipe.tags.map((t) => (
              <span key={t} className="chip bg-brand-50 text-brand-600">
                {t}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => favorite.mutate()}
          className={`btn-outline shrink-0 ${recipe.favorite ? "text-amber-500 border-amber-300 bg-amber-50" : ""}`}
        >
          <IconStar filled={recipe.favorite} className="w-4 h-4" />
        </button>
      </div>

      {/* hodnocení */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => rate.mutate(n)} className="text-amber-400">
            <IconStar filled={(recipe.rating ?? 0) >= n} className="w-6 h-6" />
          </button>
        ))}
      </div>

      {/* akce */}
      <div className="flex flex-wrap gap-2">
        <Link to={`/recepty/${recipe.id}/upravit`} className="btn-outline">
          Upravit
        </Link>
        <button onClick={() => genShopping.mutate()} disabled={genShopping.isPending} className="btn-primary">
          <IconCart className="w-4 h-4" /> Chybějící do nákupu
        </button>
        <button
          onClick={() => {
            if (confirm("Opravdu smazat recept?")) remove.mutate();
          }}
          className="btn-ghost text-red-600"
        >
          <IconTrash className="w-4 h-4" /> Smazat
        </button>
      </div>
      {msg && <div className="card px-4 py-3 text-sm text-emerald-700 bg-emerald-50 border-emerald-100">{msg}</div>}

      {/* suroviny */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Suroviny</h2>
        <div className="card divide-y divide-stone-100">
          {recipe.ingredients?.map((ri) => (
            <div key={ri.id} className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-medium text-stone-800">{ri.ingredient?.name}</span>
                {ri.note && <span className="text-stone-400 text-sm"> · {ri.note}</span>}
              </div>
              <span className="text-stone-600">{formatQty(ri.quantity, ri.unit)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* postup */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Postup</h2>
        <ol className="space-y-3">
          {recipe.steps?.map((s, i) => (
            <li key={s.id} className="card p-4 flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-stone-700 whitespace-pre-wrap">{s.text}</p>
                {s.image && <img src={uploadUrl(s.image)} alt="" className="mt-2 rounded-xl max-h-48" />}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* komentáře */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Komentáře</h2>
        <div className="flex gap-2 mb-3">
          <input
            className="input"
            placeholder="Přidat poznámku…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && comment.trim() && addComment.mutate()}
          />
          <button onClick={() => addComment.mutate()} disabled={!comment.trim()} className="btn-primary shrink-0">
            Přidat
          </button>
        </div>
        <div className="space-y-2">
          {recipe.comments?.map((c) => (
            <div key={c.id} className="card px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-stone-700 whitespace-pre-wrap">{c.text}</p>
                <p className="text-xs text-stone-400 mt-1">{formatDate(c.createdAt)}</p>
              </div>
              <button onClick={() => delComment.mutate(c.id)} className="text-stone-300 hover:text-red-500">
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {recipe.comments?.length === 0 && <p className="text-sm text-stone-400">Zatím žádné komentáře.</p>}
        </div>
      </section>
    </div>
  );
}
