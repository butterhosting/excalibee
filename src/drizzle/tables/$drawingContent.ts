import { blob, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Kept apart from `drawing` on purpose: listing 1000 drawings took 45 ms with the scene and thumbnail in the same
 * row (the scan reads every fat row) and 0.3 ms without them (measured 2026-09-27, 150 kB scenes + 15 kB thumbnails).
 */
export const $drawingContent = sqliteTable("drawing_content", {
  drawingId: text().primaryKey(),
  scene: text().notNull(),
  thumbnail: blob({ mode: "buffer" }),
});
