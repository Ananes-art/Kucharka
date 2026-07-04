import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import type { Recipe } from "../api/types";
import { IconPlus, IconClock, IconStar } from "../components/Icons";

export default function Recipes() {
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const recipes = useQuery({
    queryKey: ["recipes", q, favOnly],
    queryFn: () => api.get<Recipe[]>(`/recipes?q=${encodeURIComponent(q)}${favOnly ? "&favorite=true" : ""}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">Recepty</h1>
        <Link to="/recepty/novy" className="btn-primary">
          <IconPlus className="w-4 h-4" /> Nový recept
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Hledat recept…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={`btn-outline shrink-0 ${favOnly ? "text-amber-500 border-amber-300 bg-amber-50" : ""}`}
        >
          <IconStar filled={favOnly} className="w-4 h-4" /> Oblíbené
        </button>
      </div>

      {recipes.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-56 animate-pulse bg-stone-100" />
          ))}
        </div>
      ) : recipes.data && recipes.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.data.map((r) => (
            <Link key={r.id} to={`/recepty/${r.id}`} className="card overflow-hidden hover:shadow-soft transition">
              <div className="h-36 bg-stone-100 relative">
                {r.mainImage ? (
                  <img src={uploadUrl(r.mainImage)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                {r.favorite && (
                  <span className="absolute top-2 right-2 text-amber-400">
                    <IconStar filled className="w-5 h-5 drop-shadow" />
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold text-stone-800 truncate">{r.title}</div>
                {r.description && <div className="text-xs text-stone-500 line-clamp-2 mt-0.5">{r.description}</div>}
                <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                  {r.prepMinutes && (
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5" /> {r.prepMinutes} min
                    </span>
                  )}
                  <span>{r._count?.ingredients ?? 0} surovin</span>
                  {r.category && <span className="chip bg-stone-100 text-stone-600">{r.category}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card px-4 py-12 text-center text-stone-500">
          Zatím žádné recepty.{" "}
          <Link to="/recepty/novy" className="text-brand-600 hover:underline">
            Přidat první
          </Link>
        </div>
      )}
    </div>
  );
}
