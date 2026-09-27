import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { DrawingRepository } from "./DrawingRepository";
import { PersistenceError } from "./error/PersistenceError";
import { FolderRepository } from "./FolderRepository";

describe(FolderRepository.name, () => {
  let context: TestEnvironment.Context;
  let repository: FolderRepository;
  let drawingRepository: DrawingRepository;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    repository = context.folderRepository;
    drawingRepository = context.drawingRepository;
  });

  it("should do simple crud", async () => {
    // given
    const projects = TestFixture.folder({ name: "Projects" });
    const website = TestFixture.folder({ name: "Website", parentId: projects.id });

    // when
    await repository.create(projects);
    await repository.create(website);
    // then (ordered by name)
    expect(await repository.list()).toEqual([
      expect.objectContaining({ name: "Projects", parentId: undefined }),
      expect.objectContaining({ name: "Website", parentId: projects.id }),
    ]);
    expect(await repository.find(projects.id)).toEqual(expect.objectContaining({ object: "folder", name: "Projects" }));
    expect(await repository.find("does-not-exist")).toBeUndefined();

    // when (rename, and move to the top level)
    const updated = await repository.update(website.id, { name: "Site", parentId: undefined });
    // then
    expect(updated).toEqual(expect.objectContaining({ name: "Site", parentId: undefined }));
    expect(await repository.update("does-not-exist", { name: "Nope" })).toBeUndefined();

    // when
    const deleted = await repository.delete(projects.id);
    // then
    expect(deleted).toBeDefined();
    expect(await repository.find(projects.id)).toBeUndefined();
    expect(await repository.delete(projects.id)).toBeUndefined();
  });

  it("should leave the parent alone when the update does not mention it", async () => {
    // given
    const parent = TestFixture.folder();
    const child = TestFixture.folder({ parentId: parent.id });
    await repository.create(parent);
    await repository.create(child);

    // when
    const updated = await repository.update(child.id, { name: "Renamed" });
    // then
    expect(updated?.parentId).toEqual(parent.id);
  });

  it("should cascade a delete through subfolders and their drawings", async () => {
    // given
    const root = TestFixture.folder({ name: "root" });
    const child = TestFixture.folder({ name: "child", parentId: root.id });
    const grandchild = TestFixture.folder({ name: "grandchild", parentId: child.id });
    const sibling = TestFixture.folder({ name: "sibling" });
    await repository.create(root);
    await repository.create(child);
    await repository.create(grandchild);
    await repository.create(sibling);
    const deep = TestFixture.drawing({ folderId: grandchild.id });
    const top = TestFixture.drawing();
    await drawingRepository.create(deep, { drawingId: deep.id, scene: TestFixture.scene() });
    await drawingRepository.create(top, { drawingId: top.id, scene: TestFixture.scene() });

    // when
    await repository.delete(root.id);
    // then
    expect(await repository.list()).toEqual([expect.objectContaining({ id: sibling.id })]);
    expect(await drawingRepository.list()).toEqual([expect.objectContaining({ id: top.id })]);
    expect(await drawingRepository.findContent(deep.id)).toBeUndefined();
  });

  it("should keep sibling names unique, ignoring case, at the top level too", async () => {
    // given
    const parent = TestFixture.folder({ name: "Projects" });
    await repository.create(parent);
    await repository.create(TestFixture.folder({ name: "Website", parentId: parent.id }));

    // then (same name under the same parent, in another case)
    expect(repository.create(TestFixture.folder({ name: "website", parentId: parent.id }))).rejects.toBeInstanceOf(PersistenceError);
    expect(repository.create(TestFixture.folder({ name: "projects" }))).rejects.toBeInstanceOf(PersistenceError);
    // then (the same name elsewhere is fine)
    expect(await repository.create(TestFixture.folder({ name: "Projects", parentId: parent.id }))).toBeDefined();

    // when (a move into a folder that already has that name)
    const other = TestFixture.folder({ name: "Website" });
    await repository.create(other);
    // then
    expect(repository.update(other.id, { parentId: parent.id })).rejects.toBeInstanceOf(PersistenceError);
  });

  it("should refuse a parent that does not exist", async () => {
    // when
    const action = () => repository.create(TestFixture.folder({ parentId: Bun.randomUUIDv7() }));
    // then (the foreign key is enforced)
    expect(action()).rejects.toThrow();
  });
});
