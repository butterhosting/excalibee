import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

export type Folder = {
  id: string;
  object: "folder";
  name: string;
  parentId?: string;
  created: Temporal.Instant;
  updated?: Temporal.Instant;
};

export namespace Folder {
  export const parse = ZodParser.forType<Folder>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.uuid(),
        object: z.literal("folder"),
        name: z.string(),
        parentId: z.uuid().optional(),
        created: z.string().transform(ZodParser.instant),
        updated: z
          .string()
          .transform(ZodParser.instant)
          .optional(),
      }),
    )
    .ensureTypeMatchesSchema();
}
