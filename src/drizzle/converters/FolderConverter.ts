import { $folder } from "@/drizzle/schema";
import { Folder } from "@/models/Folder";
import { Temporal } from "@js-temporal/polyfill";
import { InferSelectModel } from "drizzle-orm";

/**
 * The direction is explicit on purpose: a `Partial<Folder>` and a `Partial<$Folder>` are not reliably
 * distinguishable at runtime, and picking the wrong direction silently passes `Temporal.Instant`s to the driver.
 */
export namespace FolderConverter {
  type $Folder = InferSelectModel<typeof $folder>;

  export function toDatabase(model: Folder): $Folder;
  export function toDatabase(model: Partial<Folder>): Partial<$Folder>;
  export function toDatabase(model: Partial<Folder>): Partial<$Folder> {
    return {
      id: model.id,
      // `null` clears the parent on update, `undefined` leaves it alone; only the update path passes a bare `null`
      parentId: "parentId" in model ? (model.parentId ?? null) : undefined,
      name: model.name,
      created: model.created?.toString(),
      updated: model.updated?.toString(),
    };
  }

  export function fromDatabase(db: $Folder): Folder;
  export function fromDatabase(db: Partial<$Folder>): Partial<Folder>;
  export function fromDatabase(db: Partial<$Folder>): Partial<Folder> {
    return {
      id: db.id,
      object: "folder",
      name: db.name,
      parentId: db.parentId ?? undefined,
      created: db.created ? Temporal.Instant.from(db.created) : undefined,
      updated: db.updated ? Temporal.Instant.from(db.updated) : undefined,
    };
  }
}
