import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { normalize } from "../lib/text.js";
import { UNITS } from "../lib/units.js";

const ingredientSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  baseUnit: z.enum(["g", "ml", "ks"]).default("ks"),
});

const aliasSchema = z.object({
  keyword: z.string().min(1),
  label: z.string().min(1),
});

export async function ingredientRoutes(app: FastifyInstance) {
  // seznam surovin s aliasy a aktuálním stavem skladu
  app.get("/", async () => {
    const items = await prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: { aliases: true, stockItems: true },
    });
    return items.map((i) => ({
      ...i,
      inStock: i.stockItems.length > 0,
    }));
  });

  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const item = await prisma.ingredient.findUnique({
      where: { id },
      include: { aliases: true },
    });
    if (!item) return reply.code(404).send({ error: "Surovina nenalezena" });
    return item;
  });

  app.post("/", async (req, reply) => {
    const body = ingredientSchema.parse(req.body);
    try {
      return await prisma.ingredient.create({
        data: { name: body.name.trim(), category: body.category ?? null, baseUnit: body.baseUnit },
      });
    } catch (e: any) {
      if (e.code === "P2002") return reply.code(409).send({ error: "Surovina se stejným názvem už existuje" });
      throw e;
    }
  });

  app.put("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = ingredientSchema.partial().parse(req.body);
    try {
      return await prisma.ingredient.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.baseUnit !== undefined ? { baseUnit: body.baseUnit } : {}),
        },
      });
    } catch (e: any) {
      if (e.code === "P2025") return reply.code(404).send({ error: "Surovina nenalezena" });
      throw e;
    }
  });

  app.delete("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    // nedovolíme smazat surovinu použitou v receptu nebo skladu
    const used = await prisma.recipeIngredient.count({ where: { ingredientId: id } });
    const stock = await prisma.stockItem.count({ where: { ingredientId: id } });
    if (used > 0 || stock > 0)
      return reply.code(409).send({ error: "Surovina je použita v receptu nebo skladu" });
    await prisma.ingredient.delete({ where: { id } });
    return { ok: true };
  });

  // --- aliasy (klíč z účtenky -> surovina) ---
  app.post("/:id/aliases", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = aliasSchema.parse(req.body);
    const keyword = normalize(body.keyword);
    try {
      return await prisma.ingredientAlias.upsert({
        where: { keyword },
        update: { ingredientId: id, label: body.label },
        create: { keyword, label: body.label, ingredientId: id },
      });
    } catch (e: any) {
      if (e.code === "P2003") return reply.code(404).send({ error: "Surovina nenalezena" });
      throw e;
    }
  });

  app.delete("/aliases/:aliasId", async (req) => {
    const aliasId = Number((req.params as any).aliasId);
    await prisma.ingredientAlias.delete({ where: { id: aliasId } });
    return { ok: true };
  });

  app.get("/units/list", async () => UNITS);
}
