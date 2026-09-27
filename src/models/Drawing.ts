import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

/**
 * The metadata of a drawing. The scene and thumbnail are large and live in `DrawingContent`, fetched on their own.
 */
export type Drawing = {
  id: string;
  object: "drawing";
  folderId?: string;
  name: string;
  searchText: string;
  created: Temporal.Instant;
  updated?: Temporal.Instant;
};

export namespace Drawing {
  export const parse = ZodParser.forType<Drawing>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.uuid(),
        object: z.literal("drawing"),
        folderId: z.uuid().optional(),
        name: z.string(),
        searchText: z.string(),
        created: z.string().transform(ZodParser.instant),
        updated: z.string().transform(ZodParser.instant).optional(),
      }),
    )
    .ensureTypeMatchesSchema();
}
