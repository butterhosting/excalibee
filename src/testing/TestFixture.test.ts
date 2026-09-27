import { Drawing } from "@/models/Drawing";
import { DrawingScene } from "@/models/DrawingScene";
import { Folder } from "@/models/Folder";
import { Temporal } from "@js-temporal/polyfill";

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export namespace TestFixture {
  export function folder(overrides: DeepPartial<Folder> = {}): Folder {
    const defaults: Folder = {
      id: Bun.randomUUIDv7(),
      object: "folder",
      name: "Projects",
      created: Temporal.Now.instant(),
    };
    return deepMerge(defaults, overrides);
  }

  export function drawing(overrides: DeepPartial<Drawing> = {}): Drawing {
    const defaults: Drawing = {
      id: Bun.randomUUIDv7(),
      object: "drawing",
      name: "System overview",
      searchText: "",
      created: Temporal.Now.instant(),
    };
    return deepMerge(defaults, overrides);
  }

  export function scene(...texts: string[]): DrawingScene {
    return {
      elements: texts.map((text, i) => ({ id: `text-${i}`, type: "text", text, isDeleted: false, version: 1 })),
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    };
  }

  /**
   * The smallest valid PNG there is: a 1×1 transparent pixel
   */
  export const PNG = Uint8Array.fromBase64(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  );

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }

  function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
    const result = { ...target } as Record<string, unknown>;
    for (const key in source) {
      const sourceVal = (source as Record<string, unknown>)[key];
      const targetVal = result[key];
      if (sourceVal !== undefined) {
        if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
          result[key] = deepMerge(targetVal, sourceVal);
        } else {
          result[key] = sourceVal;
        }
      }
    }
    return result as T;
  }
}
