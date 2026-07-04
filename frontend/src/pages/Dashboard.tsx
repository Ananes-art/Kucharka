import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import type { StockItem, Recommendation } from "../api/types";
import { daysUntil, expiryTone, formatQty } from "../lib/format";
import { IconClock } from "../components/Icons";

export default function Dashboard() {
  const expiring = useQuery({
    queryKey: ["stock", "expiring"],
    queryFn: () => api.get<StockItem[]>("/stock/expiring?days=7"),
  });
  const recs = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.get<Recommendation[]>("/recommendations?days=7"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Dobrý den 👋</h1>
        <p className="text-stone-500">Co dnes uvaříme, ať nic nevyhodíme?</p>
      </div>

      {/* Blíží se spotřeba */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-800">Blíží se spotřeba</h2>
          <Link to="/sklad" className="text-sm text-brand-600 hover:underline">
            Celý sklad
          </Link>
        </div>
        {expiring.isLoading ? (
          <SkeletonRow />
        ) : expiring.data && expiring.data.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {expiring.data.map((s) => {
              const d = daysUntil(s.expiryDate);
              const tone = expiryTone(d);
              return (
                <div key={s.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-800">{s.ingredient.name}</div>
                    <div className="text-xs text-stone-500">{formatQty(s.quantity, s.unit)}</div>
                  </div>
                  <span className={`chip ${tone.className}`}>{tone.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card px-4 py-8 text-center text-stone-500">
            Nic vám v nejbližších dnech nekončí 🎉
          </div>
        )}
      </section>

      {/* Doporučené recepty */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Doporučené recepty</h2>
        {recs.isLoading ? (
          <SkeletonRow />
        ) : recs.data && recs.data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {recs.data.slice(0, 8).map((r) => (
              <Link key={r.id} to={`/recepty/${r.id}`} className="card overflow-hidden hover:shadow-soft transition">
                <div className="flex">
                  <div className="w-24 h-24 bg-stone-100 shrink-0">
                    {r.mainImage ? (
                      <img src={uploadUrl(r.mainImage)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-3 min-w-0 flex-1">
                    <div className="font-semibold text-stone-800 truncate">{r.title}</div>
                    <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                      {r.prepMinutes && (
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="w-3.5 h-3.5" /> {r.prepMinutes} min
                        </span>
                      )}
                      <span>{r.availableCount}/{r.totalIngredients} surovin doma</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.expiringUsed.slice(0, 3).map((e) => {
                        const tone = expiryTone(e.daysLeft);
                        return (
                          <span key={e.name} className={`chip ${tone.className}`}>
                            {e.name} · {tone.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card px-4 py-8 text-center text-stone-500">
            Zatím žádná doporučení. Přidejte recepty a naskladněte suroviny.
          </div>
        )}
      </section>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="card h-20 animate-pulse bg-stone-100" />
      ))}
    </div>
  );
}
