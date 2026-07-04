import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const itemSchema = z.object({
  name: z.string().min(1),
  ingredientId: z.number().int().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function shoppingRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return prisma.shoppingItem.findMany({
      orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
      include: { ingredient: true },
    });
  });

  app.post("/", async (req) => {
    const body = itemSchema.parse(req.body);
    return prisma.shoppingItem.create({
      data: {
        name: body.name,
        ingredientId: body.ingredientId ?? null,
        quantity: body.quantity ?? null,
        unit: body.unit ?? null,
        note: body.note ?? null,
      },
    });
  });

  app.post("/:id/check", async (req) => {
    const id = Number((req.params as any).id);
    const item = await prisma.shoppingItem.findUnique({ where: { id } });
    return prisma.shoppingItem.update({ where: { id }, data: { checked: !item?.checked } });
  });

  app.delete("/:id", async (req) => {
    const id = Number((req.params as any).id);
    await prisma.shoppingItem.delete({ where: { id } });
    return { ok: true };
  });

  // smaž odškrtnuté položky
  app.delete("/", async () => {
    const r = await prisma.shoppingItem.deleteMany({ where: { checked: true } });
    return { deleted: r.count };
  });
}
