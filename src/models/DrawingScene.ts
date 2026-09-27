import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type DrawingScene = {
  elements: Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export namespace DrawingScene {
  export const parse = ZodParser.forType<DrawingScene>()
    .ensureSchemaMatchesType(() =>
      z.object({
        elements: z.array(z.record(z.string(), z.unknown())),
        appState: z.record(z.string(), z.unknown()),
        files: z.record(z.string(), z.unknown()),
      }),
    )
    .ensureTypeMatchesSchema();

  export const EMPTY: DrawingScene = { elements: [], appState: {}, files: {} };

  export function extractText(scene: DrawingScene): string {
    return scene.elements
      .filter((element) => element.type === "text" && !element.isDeleted && typeof element.text === "string")
      .map((element) => (element.text as string).trim())
      .filter((text) => text.length > 0)
      .join("\n");
  }
}
