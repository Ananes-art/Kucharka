import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { env } from "./env.js";

import { ingredientRoutes } from "./routes/ingredients.js";
import { recipeRoutes } from "./routes/recipes.js";
import { stockRoutes } from "./routes/stock.js";
import { receiptRoutes } from "./routes/receipts.js";
import { shoppingRoutes } from "./routes/shopping.js";
import { recommendationRoutes } from "./routes/recommendations.js";

export async function buildServer() {
  const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: env.uploadDir,
    prefix: "/uploads/",
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(ingredientRoutes, { prefix: "/api/ingredients" });
  await app.register(recipeRoutes, { prefix: "/api/recipes" });
  await app.register(stockRoutes, { prefix: "/api/stock" });
  await app.register(receiptRoutes, { prefix: "/api/receipts" });
  await app.register(shoppingRoutes, { prefix: "/api/shopping" });
  await app.register(recommendationRoutes, { prefix: "/api/recommendations" });

  return app;
}
