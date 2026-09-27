import { Env } from "@/Env";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

export type Sqlite = Awaited<ReturnType<typeof Sqlite.initialize>>;

export namespace Sqlite {
  export async function initialize(env: Env.Private) {
    const database = new Database(env.EXCALISELF_DATABASE, { create: true });
    const sqlite = drizzle(database, {
      casing: "snake_case",
      schema,
    });
    migrate(sqlite, {
      migrationsFolder: "src/drizzle/migrations",
    });
    sqlite.run("PRAGMA foreign_keys = ON");
    return Object.assign(sqlite, {
      close: () => database.close(),
    });
  }
}
