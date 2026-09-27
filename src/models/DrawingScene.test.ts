import { describe, expect, it } from "bun:test";
import { DrawingScene } from "./DrawingScene";

describe("DrawingScene", () => {
  it("should collect the text of live text elements only", () => {
    // given
    const scene: DrawingScene = {
      elements: [
        { type: "text", text: "  Browser  ", isDeleted: false },
        { type: "text", text: "gone", isDeleted: true },
        { type: "rectangle", text: "not a text element" },
        { type: "text", text: "   " },
        { type: "text", text: "SQLite" },
        { type: "text" },
      ],
      appState: {},
      files: {},
    };

    // when / then
    expect(DrawingScene.extractText(scene)).toEqual("Browser\nSQLite");
    expect(DrawingScene.extractText(DrawingScene.EMPTY)).toEqual("");
  });

  it("should accept whatever Excalidraw puts in a scene, but insist on the three parts", () => {
    // then
    expect(DrawingScene.parse({ elements: [{ anything: 1 }], appState: { zoom: { value: 1 } }, files: {} })).toBeDefined();
    expect(() => DrawingScene.parse({ elements: "nope", appState: {}, files: {} })).toThrow();
    expect(() => DrawingScene.parse({ elements: [] })).toThrow();
  });
});
