const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Content-Type: application/json posíláme jen když skutečně máme tělo,
  // jinak Fastify u prázdného těla vrací 400 (FST_ERR_CTP_EMPTY_JSON_BODY).
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body != null) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `Chyba ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Chyba ${res.status}`);
    return res.json();
  },
};

// URL k nahranému souboru
export function uploadUrl(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return `/uploads/${name}`;
}
