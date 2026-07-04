import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import type { Receipt } from "../api/types";
import { formatDate } from "../lib/format";
import { IconReceipt } from "../components/Icons";

export default function ReceiptUpload() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receipts = useQuery({ queryKey: ["receipts"], queryFn: () => api.get<Receipt[]>("/receipts") });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const receipt = await api.upload<Receipt>("/receipts/upload", file);
      await qc.invalidateQueries({ queryKey: ["receipts"] });
      navigate(`/uctenka/${receipt.id}`);
    } catch (e: any) {
      setError("Nahrání se nezdařilo: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Účtenka</h1>
      <p className="text-stone-500 text-sm">
        Vyfoťte účtenku — přečteme položky a projdeme je krok za krokem (surovina, množství, datum spotřeby).
      </p>

      <label className="card flex flex-col items-center justify-center gap-3 py-10 cursor-pointer border-2 border-dashed border-stone-200 hover:border-brand-300 transition">
        <IconReceipt className="w-10 h-10 text-brand-400" />
        <span className="font-medium text-stone-700">{uploading ? "Zpracovávám účtenku…" : "Vyfotit / nahrát účtenku"}</span>
        <span className="text-xs text-stone-400">OCR může chvíli trvat</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={uploading}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {error && <div className="card px-4 py-3 text-sm text-red-700 bg-red-50 border-red-100">{error}</div>}

      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Historie účtenek</h2>
        {receipts.data && receipts.data.length > 0 ? (
          <div className="card divide-y divide-stone-100">
            {receipts.data.map((r) => (
              <Link key={r.id} to={`/uctenka/${r.id}`} className="px-4 py-3 flex items-center justify-between hover:bg-stone-50">
                <div>
                  <div className="font-medium text-stone-800">{r.store ?? "Účtenka"}</div>
                  <div className="text-xs text-stone-500">
                    {formatDate(r.purchasedAt ?? r.createdAt)} · {r._count?.lines ?? 0} položek
                    {r.total != null && <> · {r.total.toFixed(2)} Kč</>}
                  </div>
                </div>
                <span className={`chip ${r.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {r.status === "done" ? "zpracováno" : "čeká"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">Zatím žádné účtenky.</p>
        )}
      </section>
    </div>
  );
}
