import { $drawing, $drawingContent } from "@/drizzle/schema";
import { Drawing } from "@/models/Drawing";
import { DrawingContent } from "@/models/DrawingContent";
import { DrawingScene } from "@/models/DrawingScene";
import { Temporal } from "@js-temporal/polyfill";
import { InferSelectModel } from "drizzle-orm";

/**
 * The direction is explicit on purpose: a `Partial<Drawing>` and a `Partial<$Drawing>` are not reliably
 * distinguishable at runtime, and picking the wrong direction silently passes `Temporal.Instant`s to the driver.
 */
export namespace DrawingConverter {
  type $Drawing = InferSelectModel<typeof $drawing>;
  type $DrawingContent = InferSelectModel<typeof $drawingContent>;

  export function toDatabase(model: Drawing): $Drawing;
  export function toDatabase(model: Partial<Drawing>): Partial<$Drawing>;
  export function toDatabase(model: Partial<Drawing>): Partial<$Drawing> {
    return {
      id: model.id,
      // `null` moves the drawing to the top level on update, `undefined` leaves the folder alone
      folderId: "folderId" in model ? (model.folderId ?? null) : undefined,
      name: model.name,
      searchText: model.searchText,
      created: model.created?.toString(),
      updated: model.updated?.toString(),
    };
  }

  export function fromDatabase(db: $Drawing): Drawing;
  export function fromDatabase(db: Partial<$Drawing>): Partial<Drawing>;
  export function fromDatabase(db: Partial<$Drawing>): Partial<Drawing> {
    return {
      id: db.id,
      object: "drawing",
      name: db.name,
      folderId: db.folderId ?? undefined,
      searchText: db.searchText,
      created: db.created ? Temporal.Instant.from(db.created) : undefined,
      updated: db.updated ? Temporal.Instant.from(db.updated) : undefined,
    };
  }

  export function contentToDatabase(model: DrawingContent): $DrawingContent;
  export function contentToDatabase(model: Partial<DrawingContent>): Partial<$DrawingContent>;
  export function contentToDatabase(model: Partial<DrawingContent>): Partial<$DrawingContent> {
    return {
      drawingId: model.drawingId,
      scene: model.scene ? JSON.stringify(model.scene) : undefined,
      thumbnail: "thumbnail" in model ? (model.thumbnail ? Buffer.from(model.thumbnail) : null) : undefined,
    };
  }

  export function contentFromDatabase(db: $DrawingContent): DrawingContent {
    return {
      drawingId: db.drawingId,
      scene: DrawingScene.parse(JSON.parse(db.scene)),
      thumbnail: db.thumbnail ?? undefined,
    };
  }
}
