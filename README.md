# 🍳 Kuchařka

Osobní kuchařka s hlídáním spotřeby surovin. Recepty, sklad surovin, **načítání
nakoupených surovin přímo z účtenky (foto → OCR)**, hlídání data spotřeby a
doporučení receptů podle surovin, kterým se blíží konec trvanlivosti.

## Co umí

- **Recepty** – suroviny s množstvím, postup po krocích s obrázky, hlavní foto,
  komentáře, hodnocení, oblíbené, štítky, kategorie, počet porcí, fulltext hledání.
- **Sklad (spižírna)** – množství a datum spotřeby u každé položky.
- **Účtenka → sklad** – vyfotíš účtenku, OCR (Tesseract, česky) přečte položky a
  **průvodce po položkách** tě provede: přiřaď surovinu z číselníku / založ novou,
  zadej množství a **datum spotřeby**. Naučené mapování „text z účtenky → surovina"
  se pamatuje (aliasy), takže příště to systém pozná sám.
- **Číselník surovin** – jednotný seznam, aby nevznikal bordel (např. „chleba
  máslový" z účtenky se zařadí pod surovinu *Chléb*).
- **Hlídání spotřeby** – sekce „Blíží se spotřeba" a barevné odznaky.
- **Doporučené recepty** – prioritizované podle surovin, kterým se blíží (nebo prošlo)
  datum spotřeby, aby se nic nevyhazovalo.
- **Nákupní seznam** – z ručně vybraného receptu vygeneruje suroviny, které **nemáš
  doma** (počítá i množství proti skladu).
- **Moderní responsivní design** + PWA (přidání na plochu telefonu).

## Stack

- **Backend:** Node + TypeScript, Fastify, Prisma, PostgreSQL, Tesseract OCR, sharp, Zod
- **Frontend:** React + Vite + TypeScript, TailwindCSS, TanStack Query, React Router
- **Kontejnery:** Docker / Podman (compose)

## Spuštění (Podman nebo Docker)

```bash
cp .env.example .env        # volitelně uprav hesla/porty
podman compose up -d --build
# nebo: docker compose up -d --build
```

- Frontend: <http://localhost:8080>
- Backend API: <http://localhost:3000/api/health>

Databázové schéma se aplikuje automaticky při startu (`prisma db push`) a naplní se
základní číselník surovin (seed).

### Konfigurace (`.env`)

Všechny proměnné mají výchozí hodnoty, `.env` je tedy volitelný. Přehled (viz
`.env.example`):

| Proměnná | Výchozí | Popis |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `kucharka` | přihlašovací údaje a název databáze |
| `FRONTEND_PORT` | `8080` | port webu na hostiteli |
| `BACKEND_PORT` | `3000` | port API na hostiteli |
| `VITE_API_BASE` | `/api` | cesta k API pro frontend |

### Zobrazení na telefonu

Appka je responsivní a běží doma. Na telefonu ve stejné síti otevři
`http://<IP-tvého-PC>:8080`. V prohlížeči lze „Přidat na plochu" (PWA).

## Vývoj lokálně (bez kontejnerů)

Potřebuješ běžící PostgreSQL a nainstalovaný `tesseract-ocr` + `tesseract-ocr-ces`.

```bash
# backend
cd backend
npm install
export DATABASE_URL="postgresql://kucharka:kucharka@localhost:5432/kucharka"
npx prisma db push
npm run seed
npm run dev            # http://localhost:3000

# frontend (druhý terminál)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxy na backend)
```

## Testy

```bash
cd backend && npm test
```

Unit testy pokrývají klíčovou logiku: přepočty jednotek, normalizaci/podobnost
textu, parser účtenky a skórování doporučení.

## Architektura – přehled datového modelu

- `Ingredient` (číselník) + `IngredientAlias` (text z účtenky → surovina)
- `Recipe` → `RecipeIngredient`, `RecipeStep`, `Comment`
- `StockItem` (sklad s expirací)
- `Receipt` → `ReceiptLine` (řádky z OCR pro průvodce)
- `ShoppingItem` (nákupní seznam)

## Nápady na rozšíření (další verze)

- Přehled útraty za potraviny z účtenek (statistiky).
- Notifikace expirace e-mailem / push.
- Import/export receptů (JSON) a zálohy DB.
- Plánovač jídel na týden a automatický souhrnný nákupní seznam.
- Přihlášení a sdílení v domácnosti (víc uživatelů).
