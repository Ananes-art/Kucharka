import { buildServer } from "./server.js";
import { env } from "./env.js";

const app = await buildServer();

try {
  await app.listen({ port: env.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
