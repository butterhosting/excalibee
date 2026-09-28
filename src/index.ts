import { mkdir } from "fs/promises";
import { dirname } from "path";
import { Sqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { Logger } from "./Logger";
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
await ServerRegistry.bootstrap(env, sqlite);
