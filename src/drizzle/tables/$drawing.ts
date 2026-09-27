import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $drawing = sqliteTable("drawing", {
  id: text().primaryKey(),
  folderId: text(),
  name: text().notNull(),
  searchText: text().notNull(),
  created: text().notNull(),
  updated: text(),
});
