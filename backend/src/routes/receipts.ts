import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { saveUpload } from "../lib/upload.js";
import { runOcr } from "../services/ocr.js";
import { parseReceipt } from "../services/receiptParser.js";
import { normalize, similarity } from "../lib/text.js";
import { env } from "../env.js";
import { join } from "node:path";

interface Suggestion {
  ingredientId: number | null;
  name: string | null;
  score: number;
  source: "alias" | "fuzzy" | null;
}

// najdi nejlepší surovinu z číselníku pro klíčové slovo z účtenky
async function suggest(keyword: string): Promise<Suggestion> {
  const key = normalize(keyword);
  // 1) přesná shoda aliasu
  const alias = await prisma.ingredientAlias.findUnique({
    where: { keyword: key },
    include: { ingredient: true },
  });
  if (alias) return { ingredientId: alias.ingredientId, name: alias.ingredient.name, score: 1, source: "alias" };

  // 2) fuzzy shoda proti názvům surovin a aliasům
  const [ingredients, aliases] = await Promise.all([
    prisma.ingredient.findMany(),
    prisma.ingredientAlias.findMany({ include: { ingredient: true } }),
  ]);

  let best: Suggestion = { ingredientId: null, name: null, score: 0, source: null };
  for (const ing of ingredients) {
    const s = similarity(key, normalize(ing.name));
    if (s > best.score) best = { ingredientId: ing.id, name: ing.name, score: s, source: "fuzzy" };
  }
  for (const al of aliases) {
    const s = similarity(key, al.keyword);
    if (s > best.score) best = { ingredientId: al.ingredientId, name: al.ingredient.name, score: s, source: "fuzzy" };
  }
  // pod prahem raději nic nenavrhuj
  if (best.score < 0.45) return { ingredientId: null, name: null, score: best.score, source: null };
  return best;
}

async function withSuggestions(receiptId: number) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { lines: { orderBy: { id: "asc" } } },
  });
  if (!receipt) return null;
  const lines = await Promise.all(
    receipt.lines.map(async (l) => ({
      ...l,
      suggestion: l.ingredientId ? null : await suggest(l.keyword),
    }))
  );
  return { ...receipt, lines };
}

const confirmSchema = z.object({
  store: z.string().optional().nullable(),
  purchasedAt: z.string().datetime().optional().nullable(),
  total: z.number().optional().nullable(),
  lines: z.array(
    z.object({
      lineId: z.number().int(),
      action: z.enum(["assign", "create", "ignore"]),
      ingredientId: z.number().int().optional().nullable(),
      newIngredient: z
        .object({
          name: z.string().min(1),
          baseUnit: z.enum(["g", "ml", "ks"]).default("ks"),
          category: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      saveAlias: z.boolean().default(true),
      aliasLabel: z.string().optional().nullable(),
      quantity: z.number().positive().optional().nullable(),
      unit: z.enum(["g", "kg", "ml", "l", "ks"]).optional().nullable(),
      expiryDate: z.string().datetime().optional().nullable(),
    })
  ),
});

export async function receiptRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return prisma.receipt.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { lines: true } } },
    });
  });

  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const data = await withSuggestions(id);
    if (!data) return reply.code(404).send({ error: "Účtenka nenalezena" });
    return data;
  });

  // nahraj foto účtenky -> OCR -> parse -> ulož řádky
  app.post("/upload", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "Chybí soubor" });
    const buf = await file.toBuffer();
    const imageName = await saveUpload(buf, file.filename);

    const imagePath = join(env.uploadDir, imageName);
    let rawText = "";
    try {
      rawText = await runOcr(imagePath);
    } catch (e) {
      req.log.error(e, "OCR selhalo");
    }

    const parsed = parseReceipt(rawText);

    const receipt = await prisma.receipt.create({
      data: {
        image: imageName,
        store: parsed.store,
        purchasedAt: parsed.purchasedAt,
        total: parsed.total,
        rawText,
        lines: {
          create: parsed.lines.map((l) => ({
            rawText: l.rawText,
            keyword: l.keyword,
            quantity: l.quantity,
            unit: l.unit,
            price: l.price,
          })),
        },
      },
    });

    return withSuggestions(receipt.id);
  });

  // potvrzení průvodce -> vytvoření surovin, aliasů a skladových položek
  app.post("/:id/confirm", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = confirmSchema.parse(req.body);

    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) return reply.code(404).send({ error: "Účtenka nenalezena" });

    let added = 0;
    const purchasedIds = new Set<number>();
    for (const line of body.lines) {
      const dbLine = await prisma.receiptLine.findUnique({ where: { id: line.lineId } });
      if (!dbLine || dbLine.receiptId !== id) continue;

      if (line.action === "ignore") {
        await prisma.receiptLine.update({ where: { id: line.lineId }, data: { ignored: true } });
        continue;
      }

      // urči surovinu
      let ingredientId = line.ingredientId ?? null;
      if (line.action === "create" && line.newIngredient) {
        const created = await prisma.ingredient.upsert({
          where: { name: line.newIngredient.name.trim() },
          update: {},
          create: {
            name: line.newIngredient.name.trim(),
            baseUnit: line.newIngredient.baseUnit,
            category: line.newIngredient.category ?? null,
          },
        });
        ingredientId = created.id;
      }
      if (!ingredientId) continue;

      // ulož alias klíč z účtenky -> surovina (aby to příště poznalo)
      if (line.saveAlias && dbLine.keyword) {
        await prisma.ingredientAlias.upsert({
          where: { keyword: dbLine.keyword },
          update: { ingredientId, label: line.aliasLabel ?? dbLine.rawText },
          create: { keyword: dbLine.keyword, label: line.aliasLabel ?? dbLine.rawText, ingredientId },
        });
      }

      // vytvoř skladovou položku
      const qty = line.quantity ?? dbLine.quantity ?? 1;
      const unit = line.unit ?? (dbLine.unit as any) ?? "ks";
      await prisma.stockItem.create({
        data: {
          ingredientId,
          quantity: qty,
          unit,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          purchaseDate: receipt.purchasedAt ?? new Date(),
          receiptId: id,
        },
      });

      await prisma.receiptLine.update({
        where: { id: line.lineId },
        data: { ingredientId, quantity: qty, unit, expiryDate: line.expiryDate ? new Date(line.expiryDate) : null, processed: true },
      });
      purchasedIds.add(ingredientId);
      added++;
    }

    // dokončení nákupu: co se koupilo, smaž z nákupního seznamu
    let removedFromShopping = 0;
    if (purchasedIds.size > 0) {
      const ids = [...purchasedIds];
      // 1) položky navázané na koupenou surovinu
      const byId = await prisma.shoppingItem.deleteMany({ where: { ingredientId: { in: ids } } });
      removedFromShopping += byId.count;
      // 2) volně psané položky (bez suroviny) shodné názvem s koupenou surovinou
      const purchased = await prisma.ingredient.findMany({ where: { id: { in: ids } } });
      const names = new Set(purchased.map((p) => normalize(p.name)));
      const freeItems = await prisma.shoppingItem.findMany({ where: { ingredientId: null } });
      const freeToDelete = freeItems.filter((it) => names.has(normalize(it.name))).map((it) => it.id);
      if (freeToDelete.length) {
        const byName = await prisma.shoppingItem.deleteMany({ where: { id: { in: freeToDelete } } });
        removedFromShopping += byName.count;
      }
    }

    await prisma.receipt.update({ where: { id }, data: { status: "done" } });
    return { added, removedFromShopping };
  });

  app.delete("/:id", async (req) => {
    const id = Number((req.params as any).id);
    await prisma.receipt.delete({ where: { id } });
    return { ok: true };
  });
}
