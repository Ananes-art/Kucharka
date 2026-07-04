import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { saveUpload } from "../lib/upload.js";
import { toBase } from "../lib/units.js";

const recipeIngredientSchema = z.object({
  ingredientId: z.number().int(),
  quantity: z.number().nonnegative(),
  unit: z.enum(["g", "kg", "ml", "l", "ks"]),
  note: z.string().optional().nullable(),
});

const stepSchema = z.object({
  order: z.number().int(),
  text: z.string().min(1),
  image: z.string().optional().nullable(),
});

const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  prepMinutes: z.number().int().positive().optional().nullable(),
  servings: z.number().int().positive().default(2),
  ingredients: z.array(recipeIngredientSchema).default([]),
  steps: z.array(stepSchema).default([]),
});

export async function recipeRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const q = (req.query as any).q as string | undefined;
    const favorite = (req.query as any).favorite as string | undefined;
    const recipes = await prisma.recipe.findMany({
      where: {
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        ...(favorite === "true" ? { favorite: true } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { ingredients: true, comments: true } } },
    });
    return recipes;
  });

  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        steps: { orderBy: { order: "asc" } },
        comments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!recipe) return reply.code(404).send({ error: "Recept nenalezen" });
    return recipe;
  });

  app.post("/", async (req) => {
    const body = recipeSchema.parse(req.body);
    return prisma.recipe.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        category: body.category ?? null,
        tags: body.tags,
        prepMinutes: body.prepMinutes ?? null,
        servings: body.servings,
        ingredients: { create: body.ingredients },
        steps: { create: body.steps },
      },
      include: { ingredients: true, steps: true },
    });
  });

  app.put("/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = recipeSchema.parse(req.body);
    const exists = await prisma.recipe.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ error: "Recept nenalezen" });

    // nahradíme suroviny a kroky (jednoduchý a spolehlivý přístup)
    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
      prisma.recipeStep.deleteMany({ where: { recipeId: id } }),
      prisma.recipe.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description ?? null,
          category: body.category ?? null,
          tags: body.tags,
          prepMinutes: body.prepMinutes ?? null,
          servings: body.servings,
          ingredients: { create: body.ingredients },
          steps: { create: body.steps },
        },
      }),
    ]);
    return prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } }, steps: true },
    });
  });

  app.delete("/:id", async (req) => {
    const id = Number((req.params as any).id);
    await prisma.recipe.delete({ where: { id } });
    return { ok: true };
  });

  // hlavní obrázek receptu (multipart)
  app.post("/:id/image", async (req, reply) => {
    const id = Number((req.params as any).id);
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "Chybí soubor" });
    const buf = await file.toBuffer();
    const name = await saveUpload(buf, file.filename);
    const recipe = await prisma.recipe.update({ where: { id }, data: { mainImage: name } });
    return { mainImage: recipe.mainImage };
  });

  // obrázek ke kroku
  app.post("/:id/steps/:stepId/image", async (req, reply) => {
    const stepId = Number((req.params as any).stepId);
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "Chybí soubor" });
    const buf = await file.toBuffer();
    const name = await saveUpload(buf, file.filename);
    const step = await prisma.recipeStep.update({ where: { id: stepId }, data: { image: name } });
    return { image: step.image };
  });

  // komentáře
  app.post("/:id/comments", async (req) => {
    const id = Number((req.params as any).id);
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    return prisma.comment.create({ data: { recipeId: id, text } });
  });

  app.delete("/comments/:commentId", async (req) => {
    const commentId = Number((req.params as any).commentId);
    await prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  });

  // hodnocení a oblíbené
  app.post("/:id/rating", async (req) => {
    const id = Number((req.params as any).id);
    const { rating } = z.object({ rating: z.number().int().min(1).max(5) }).parse(req.body);
    return prisma.recipe.update({ where: { id }, data: { rating } });
  });

  app.post("/:id/favorite", async (req) => {
    const id = Number((req.params as any).id);
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    return prisma.recipe.update({ where: { id }, data: { favorite: !recipe?.favorite } });
  });

  // vygeneruj nákupní seznam z chybějících surovin receptu
  app.post("/:id/shopping-list", async (req, reply) => {
    const id = Number((req.params as any).id);
    const servingsOverride = (req.body as any)?.servings as number | undefined;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!recipe) return reply.code(404).send({ error: "Recept nenalezen" });

    const factor = servingsOverride ? servingsOverride / recipe.servings : 1;
    const created: any[] = [];

    for (const ri of recipe.ingredients) {
      const base = ri.ingredient.baseUnit;
      const needBase = toBase(ri.quantity * factor, ri.unit, base);

      // spočítej dostupné množství ve skladu
      const stock = await prisma.stockItem.findMany({ where: { ingredientId: ri.ingredientId } });
      let haveBase = 0;
      let convertible = needBase !== null;
      for (const s of stock) {
        const b = toBase(s.quantity, s.unit, base);
        if (b === null) convertible = false;
        else haveBase += b;
      }

      // kolik chybí
      let missing = true;
      let missingQty: number | null = null;
      if (convertible && needBase !== null) {
        const diff = needBase - haveBase;
        missing = diff > 0.0001;
        missingQty = missing ? diff : 0;
      } else {
        // nedokážeme porovnat jednotky -> přidej, pokud nic není skladem
        missing = stock.length === 0;
      }

      if (missing) {
        const item = await prisma.shoppingItem.create({
          data: {
            ingredientId: ri.ingredientId,
            name: ri.ingredient.name,
            quantity: missingQty ?? ri.quantity * factor,
            unit: missingQty !== null ? base : ri.unit,
            note: `pro recept: ${recipe.title}`,
          },
        });
        created.push(item);
      }
    }

    return { added: created.length, items: created };
  });
}
