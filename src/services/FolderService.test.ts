import { Folder } from "@/models/Folder";
import { PersistenceError } from "@/repositories/error/PersistenceError";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { FolderService } from "./FolderService";

describe(FolderService.name, () => {
  let context: TestEnvironment.Context;
  let service: FolderService;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new FolderService(context.folderRepositoryMock.cast());
  });

  describe("create", () => {
    it("should trim the name and assign an id", async () => {
      // given
      context.folderRepositoryMock.create.mockImplementation(async (folder: Folder) => folder);

      // when
      const folder = await service.create({ name: "  Projects  " });
      // then
      expect(folder).toEqual(expect.objectContaining({ object: "folder", name: "Projects", parentId: undefined }));
      expect(folder.id).toBeTruthy();
      expect(folder.created).toBeDefined();
    });

    it("should reject an empty name", async () => {
      // when
      const action = () => service.create({ name: "   " });
      // then
      expect(action()).rejects.toEqual(
        expect.objectContaining({
          problem: "ServerError::invalid_request_body",
          details: { issues: [{ field: "name", description: "custom" }] },
        }),
      );
      expect(context.folderRepositoryMock.create).not.toHaveBeenCalled();
    });

    it("should reject a parent that does not exist", async () => {
      // given
      context.folderRepositoryMock.find.mockResolvedValue(undefined);
      const parentId = Bun.randomUUIDv7();

      // when
      const action = () => service.create({ name: "Child", parentId });
      // then
      expect(action()).rejects.toEqual(expect.objectContaining({ problem: "FolderError::parent_not_found", details: { parentId } }));
      expect(context.folderRepositoryMock.create).not.toHaveBeenCalled();
    });
  });

  describe("create / update, names", () => {
    it("should map a unique violation onto name_taken", async () => {
      // given
      context.folderRepositoryMock.create.mockRejectedValue(new PersistenceError("unique_violation"));
      context.folderRepositoryMock.update.mockRejectedValue(new PersistenceError("unique_violation"));
      context.folderRepositoryMock.find.mockResolvedValue(TestFixture.folder({ name: "Existing" }));

      // then
      expect(service.create({ name: "Projects" })).rejects.toEqual(expect.objectContaining({ problem: "FolderError::name_taken", details: { name: "Projects" } }));
      expect(service.update("a", { name: "Website" })).rejects.toEqual(expect.objectContaining({ problem: "FolderError::name_taken", details: { name: "Website" } }));
      // then (a move reports the folder's current name)
      expect(service.update("a", { parentId: null })).rejects.toEqual(expect.objectContaining({ problem: "FolderError::name_taken", details: { name: "Existing" } }));
    });
  });

  describe("update", () => {
    it("should rename without touching the parent", async () => {
      // given
      const existing = TestFixture.folder({ parentId: Bun.randomUUIDv7() });
      context.folderRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...existing, ...update }));

      // when
      const folder = await service.update(existing.id, { name: "Renamed" });
      // then
      const [, update] = context.folderRepositoryMock.update.mock.calls[0]!;
      expect(Object.keys(update).toSorted()).toEqual(["name", "updated"]);
      expect(folder.parentId).toEqual(existing.parentId);
    });

    it("should move to the top level on a null parent", async () => {
      // given
      const existing = TestFixture.folder({ parentId: Bun.randomUUIDv7() });
      context.folderRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...existing, ...update }));

      // when
      const folder = await service.update(existing.id, { parentId: null });
      // then
      const [, update] = context.folderRepositoryMock.update.mock.calls[0]!;
      expect("parentId" in update).toBeTrue();
      expect(folder.parentId).toBeUndefined();
    });

    it("should refuse to move a folder into itself or into a descendant", async () => {
      // given (root > child > grandchild)
      const root = TestFixture.folder({ name: "root" });
      const child = TestFixture.folder({ name: "child", parentId: root.id });
      const grandchild = TestFixture.folder({ name: "grandchild", parentId: child.id });
      context.folderRepositoryMock.list.mockResolvedValue([root, child, grandchild]);
      context.folderRepositoryMock.find.mockImplementation(async (id) => [root, child, grandchild].find((f) => f.id === id));

      // when / then
      expect(service.update(root.id, { parentId: grandchild.id })).rejects.toEqual(
        expect.objectContaining({ problem: "FolderError::circular_move", details: { id: root.id, parentId: grandchild.id } }),
      );
      expect(service.update(child.id, { parentId: child.id })).rejects.toEqual(expect.objectContaining({ problem: "FolderError::circular_move" }));
      expect(context.folderRepositoryMock.update).not.toHaveBeenCalled();
    });

    it("should allow a move to an unrelated folder", async () => {
      // given
      const a = TestFixture.folder({ name: "a" });
      const b = TestFixture.folder({ name: "b" });
      context.folderRepositoryMock.list.mockResolvedValue([a, b]);
      context.folderRepositoryMock.find.mockImplementation(async (id) => [a, b].find((f) => f.id === id));
      context.folderRepositoryMock.update.mockImplementation(async (_id, update) => ({ ...a, ...update }));

      // when
      const folder = await service.update(a.id, { parentId: b.id });
      // then
      expect(folder.parentId).toEqual(b.id);
    });

    it("should throw when the folder does not exist", async () => {
      // given
      context.folderRepositoryMock.update.mockResolvedValue(undefined);

      // when
      const action = () => service.update("abc123", { name: "Nope" });
      // then
      expect(action()).rejects.toEqual(expect.objectContaining({ problem: "FolderError::not_found", details: { id: "abc123" } }));
    });
  });

  describe("find / delete", () => {
    it("should throw when the folder does not exist", async () => {
      // given
      context.folderRepositoryMock.find.mockResolvedValue(undefined);
      context.folderRepositoryMock.delete.mockResolvedValue(undefined);

      // then
      expect(service.find("abc123")).rejects.toEqual(expect.objectContaining({ problem: "FolderError::not_found" }));
      expect(service.delete("abc123")).rejects.toEqual(expect.objectContaining({ problem: "FolderError::not_found" }));
    });
  });
});
