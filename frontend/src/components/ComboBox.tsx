import { useEffect, useMemo, useRef, useState } from "react";
import { rank } from "../lib/fuzzy";

export interface ComboOption {
  id: number;
  name: string;
  sub?: string | null;
}

interface Props {
  options: ComboOption[];
  value: number | "";
  onChange: (id: number) => void;
  placeholder?: string;
  className?: string;
}

// Vyhledávací select (lookup) s fuzzy filtrem.
export default function ComboBox({ options, value, onChange, placeholder = "— vyberte —", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => rank(options, query, (o) => o.name).slice(0, 50), [options, query]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(id: number) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left w-full"
      >
        <span className={selected ? "text-stone-800 truncate" : "text-stone-400"}>
          {selected ? selected.name : placeholder}
        </span>
        <svg className="w-4 h-4 text-stone-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-soft border border-stone-200 overflow-hidden">
          <div className="p-2 border-b border-stone-100">
            <input
              ref={inputRef}
              className="input"
              placeholder="Hledat surovinu…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[active]) pick(filtered[active].id);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filtered.map((o, i) => (
              <li key={o.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                    i === active ? "bg-brand-50" : ""
                  } ${o.id === value ? "font-semibold text-brand-700" : "text-stone-700"}`}
                >
                  <span className="truncate">{o.name}</span>
                  {o.sub && <span className="text-xs text-stone-400 shrink-0">{o.sub}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-4 text-sm text-stone-400 text-center">Nic nenalezeno</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
