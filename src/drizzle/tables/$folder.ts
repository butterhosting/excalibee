import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $folder = sqliteTable("folder", {
  id: text().primaryKey(),
  parentId: text(),
  name: text().notNull(),
  created: text().notNull(),
  updated: text(),
});
