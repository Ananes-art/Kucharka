import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const stockSchema = z.object({
  ingredientId: z.number().int(),
  quantity: z.number().positive(),
  unit: z.enum(["g", "kg", "ml", "l", "ks"]),
  expiryDate: z.string().datetime().optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
});

export async function stockRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return prisma.stockItem.findMany({
      orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      include: { ingredient: true },
    });
  });

  // suroviny, kterým se blíží datum spotřeby
  app.get("/expiring", async (req) => {
    const days = Number((req.query as any).days ?? 7);
    const now = new Date();
    const limit = new Date(now.getTime() + days * 86400000);
    return prisma.stockItem.findMany({
      where: { expiryDate: { not: null, lte: limit } },
      orderBy: { expiryDate: "asc" },
      include: { ingredient: true },
    });
  });

  app.post("/", async (req) => {
    const body = stockSchema.parse(req.body);
    return prisma.stockItem.create({
      data: {
        ingredientId: body.ingredientId,
        quantity: body.quantity,
        unit: body.unit,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      },
      include: { ingredient: true },
    });
  });

  app.put("/:id", async (req) => {
    const id = Number((req.params as any).id);
    const body = stockSchema.partial().parse(req.body);
    return prisma.stockItem.update({
      where: { id },
      data: {
        ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
        ...(body.unit !== undefined ? { unit: body.unit } : {}),
        ...(body.expiryDate !== undefined
          ? { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null }
          : {}),
      },
      include: { ingredient: true },
    });
  });

  app.delete("/:id", async (req) => {
    const id = Number((req.params as any).id);
    await prisma.stockItem.delete({ where: { id } });
    return { ok: true };
  });
}
