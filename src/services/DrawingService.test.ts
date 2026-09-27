import { Drawing } from "@/models/Drawing";
import { DrawingContent } from "@/models/DrawingContent";
import { DrawingScene } from "@/models/DrawingScene";
import { PersistenceError } from "@/repositories/error/PersistenceError";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { DrawingService } from "./DrawingService";

describe(DrawingService.name, () => {
  let context: TestEnvironment.Context;
  let service: DrawingService;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new DrawingService(context.drawingRepositoryMock.cast(), context.folderRepositoryMock.cast());
  });

  describe("create", () => {
    it("should start with an empty scene and no search text", async () => {
      // given
      context.drawingRepositoryMock.create.mockImplementation(async (drawing: Drawing) => drawing);

      // when
      const drawing = await service.create({ name: "  Architecture  " });
      // then
      expect(drawing).toEqual(expect.objectContaining({ object: "drawing", name: "Architecture", folderId: undefined, searchText: "" }));
      const [, content] = context.drawingRepositoryMock.create.mock.calls[0]!;
      expect(content).toEqual({ drawingId: drawing.id, scene: DrawingScene.EMPTY });
    });

    it("should reject a folder that does not exist", async () => {
      // given
      context.folderRepositoryMock.find.mockResolvedValue(undefined);
      const folderId = Bun.randomUUIDv7();

      // when
      const action = () => service.create({ name: "Nope", folderId });
      // then
      expect(action()).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::folder_not_found", details: { folderId } }));
      expect(context.drawingRepositoryMock.create).not.toHaveBeenCalled();
    });

    it("should reject an invalid request body", async () => {
      // when
      const action = () => service.create({ name: "", folderId: "not-a-uuid" });
      // then
      expect(action()).rejects.toEqual(
        expect.objectContaining({
          problem: "ServerError::invalid_request_body",
          details: {
            issues: [
              { field: "name", description: "custom" },
              { field: "folderId", description: "invalid_format" },
            ],
          },
        }),
      );
    });
  });

  describe("create / update, names", () => {
    it("should map a unique violation onto name_taken", async () => {
      // given
      context.drawingRepositoryMock.create.mockRejectedValue(new PersistenceError("unique_violation"));
      context.drawingRepositoryMock.update.mockRejectedValue(new PersistenceError("unique_violation"));
      context.drawingRepositoryMock.find.mockResolvedValue(TestFixture.drawing({ name: "Existing" }));

      // then
      expect(service.create({ name: "Overview" })).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::name_taken", details: { name: "Overview" } }));
      expect(service.update("a", { name: "Overview" })).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::name_taken", details: { name: "Overview" } }));
      expect(service.update("a", { folderId: null })).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::name_taken", details: { name: "Existing" } }));
    });
  });

  describe("update", () => {
    it("should rename and move independently", async () => {
      // given
      const existing = TestFixture.drawing({ folderId: Bun.randomUUIDv7() });
      context.drawingRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...existing, ...update }));

      // when
      const renamed = await service.update(existing.id, { name: "Renamed" });
      const moved = await service.update(existing.id, { folderId: null });
      // then
      expect(Object.keys(context.drawingRepositoryMock.update.mock.calls[0]![1]).toSorted()).toEqual(["name", "updated"]);
      expect(renamed.folderId).toEqual(existing.folderId);
      expect(Object.keys(context.drawingRepositoryMock.update.mock.calls[1]![1]).toSorted()).toEqual(["folderId", "updated"]);
      expect(moved.folderId).toBeUndefined();
    });

    it("should throw when the drawing does not exist", async () => {
      // given
      context.drawingRepositoryMock.update.mockResolvedValue(undefined);

      // then
      expect(service.update("abc123", { name: "Nope" })).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::not_found" }));
    });
  });

  describe("saveScene", () => {
    it("should store the scene, decode the thumbnail and derive the search text", async () => {
      // given
      const existing = TestFixture.drawing();
      const scene = TestFixture.scene("Browser", "  ", "Excaliself API");
      context.drawingRepositoryMock.updateContent.mockImplementation(async (drawingId, update) => ({ drawingId, ...update }) as DrawingContent);
      context.drawingRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...existing, ...update }));

      // when
      const drawing = await service.saveScene(existing.id, { scene, thumbnail: TestFixture.PNG.toBase64() });
      // then
      const [, content] = context.drawingRepositoryMock.updateContent.mock.calls[0]!;
      expect(content.scene).toEqual(scene);
      expect(content.thumbnail).toEqual(TestFixture.PNG);
      expect(drawing.searchText).toEqual("Browser\nExcaliself API");
      expect(drawing.updated).toBeDefined();
    });

    it("should keep the thumbnail when none is sent, and clear it on null", async () => {
      // given
      context.drawingRepositoryMock.updateContent.mockImplementation(async (drawingId, update) => ({ drawingId, ...update }) as DrawingContent);
      context.drawingRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...TestFixture.drawing(), ...update }));

      // when
      await service.saveScene("a", { scene: TestFixture.scene() });
      await service.saveScene("a", { scene: TestFixture.scene(), thumbnail: null });
      // then
      expect("thumbnail" in context.drawingRepositoryMock.updateContent.mock.calls[0]![1]).toBeFalse();
      const cleared = context.drawingRepositoryMock.updateContent.mock.calls[1]![1];
      expect("thumbnail" in cleared && cleared.thumbnail === undefined).toBeTrue();
    });

    it("should reject a thumbnail that is not a png", async () => {
      // when
      const action = () => service.saveScene("a", { scene: TestFixture.scene(), thumbnail: btoa("<svg/>") });
      // then
      expect(action()).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::invalid_thumbnail" }));
      expect(context.drawingRepositoryMock.updateContent).not.toHaveBeenCalled();
    });

    it("should throw when the drawing does not exist", async () => {
      // given
      context.drawingRepositoryMock.updateContent.mockResolvedValue(undefined);

      // then
      expect(service.saveScene("abc123", { scene: TestFixture.scene() })).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::not_found" }));
    });
  });

  describe("getScene / getThumbnail", () => {
    it("should distinguish a missing drawing from a missing thumbnail", async () => {
      // given
      context.drawingRepositoryMock.findContent.mockImplementation(async (id) =>
        id === "no-thumb" ? { drawingId: id, scene: TestFixture.scene("x") } : undefined,
      );

      // then
      expect(await service.getScene("no-thumb")).toEqual(TestFixture.scene("x"));
      expect(service.getThumbnail("no-thumb")).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::no_thumbnail" }));
      expect(service.getScene("gone")).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::not_found" }));
      expect(service.getThumbnail("gone")).rejects.toEqual(expect.objectContaining({ problem: "DrawingError::not_found" }));
    });
  });
});
