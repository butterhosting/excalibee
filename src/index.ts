import { mkdir } from "fs/promises";
import { dirname } from "path";
import { Sqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { Logger } from "./Logger";
import { Server } from "./Server";
import { ServerRegistry } from "./ServerRegistry";

/**
 * Initialize the logger
 */
Logger.initialize(Env.initialize.partiallyForLogger());

/**
 * Initialize the env configuration
 */
const env = Env.initialize();

/**
 * Create the main directories
 */
await mkdir(dirname(env.EXCALIBEE_DATABASE), { recursive: true });

/**
 * Initialize the database
 */
const sqlite = await Sqlite.initialize(env);

/**
 * Bootstrap
 */
const registry = await ServerRegistry.bootstrap(env, sqlite);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    await registry.get(Server).stop();
    sqlite.close();
    process.exit(0);
  });
}
