import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { scoreRecipe, type StockInfo } from "../lib/score.js";

// Doporučí recepty tak, aby se přednostně spotřebovaly suroviny,
// kterým se blíží (nebo prošlo) datum spotřeby.
export async function recommendationRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const thresholdDays = Number((req.query as any).days ?? 7);
    const now = new Date();

    const [recipes, stock] = await Promise.all([
      prisma.recipe.findMany({
        include: { ingredients: { include: { ingredient: true } } },
      }),
      prisma.stockItem.findMany(),
    ]);

    // mapa surovina -> { skladem, nejbližší expirace }
    const stockMap = new Map<number, StockInfo>();
    for (const s of stock) {
      const cur = stockMap.get(s.ingredientId) ?? { hasStock: false, minExpiry: null };
      cur.hasStock = true;
      if (s.expiryDate) {
        if (!cur.minExpiry || s.expiryDate < cur.minExpiry) cur.minExpiry = s.expiryDate;
      }
      stockMap.set(s.ingredientId, cur);
    }

    const scored = recipes.map((recipe) => {
      const nameById = new Map(recipe.ingredients.map((ri) => [ri.ingredientId, ri.ingredient.name]));
      const result = scoreRecipe({
        ingredientIds: recipe.ingredients.map((ri) => ri.ingredientId),
        stock: stockMap,
        now,
        thresholdDays,
      });

      return {
        id: recipe.id,
        title: recipe.title,
        mainImage: recipe.mainImage,
        category: recipe.category,
        prepMinutes: recipe.prepMinutes,
        rating: recipe.rating,
        totalIngredients: recipe.ingredients.length,
        availableCount: result.availableCount,
        missingCount: result.missingCount,
        expiringUsed: result.expiringUsed.map((e) => ({
          name: nameById.get(e.ingredientId) ?? "",
          daysLeft: e.daysLeft,
        })),
        score: result.score,
      };
    });

    return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  });
}
