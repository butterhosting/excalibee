import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "bun:test";
import { PersistenceError } from "./error/PersistenceError";
import { DrawingRepository } from "./DrawingRepository";

describe(DrawingRepository.name, () => {
  let context: TestEnvironment.Context;
  let repository: DrawingRepository;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    repository = context.drawingRepository;
  });

  it("should do simple crud on the metadata", async () => {
    // given
    const folder = TestFixture.folder();
    await context.folderRepository.create(folder);
    const first = TestFixture.drawing({ name: "System overview" });
    const second = TestFixture.drawing({ name: "Onboarding flow", folderId: folder.id });

    // when
    await repository.create(first, { drawingId: first.id, scene: TestFixture.scene() });
    await repository.create(second, { drawingId: second.id, scene: TestFixture.scene() });
    // then (ordered by creation)
    expect(await repository.list()).toEqual([
      expect.objectContaining({ name: "System overview", folderId: undefined }),
      expect.objectContaining({ name: "Onboarding flow", folderId: folder.id }),
    ]);
    expect(await repository.find(first.id)).toEqual(expect.objectContaining({ object: "drawing", name: "System overview", searchText: "" }));
    expect(await repository.find("does-not-exist")).toBeUndefined();

    // when (rename, move to the top level, and index some text)
    const updated = await repository.update(second.id, { name: "Onboarding", folderId: undefined, searchText: "hello" });
    // then
    expect(updated).toEqual(expect.objectContaining({ name: "Onboarding", folderId: undefined, searchText: "hello" }));
    expect(await repository.update("does-not-exist", { name: "Nope" })).toBeUndefined();

    // when
    const deleted = await repository.delete(first.id);
    // then
    expect(deleted).toBeDefined();
    expect(await repository.find(first.id)).toBeUndefined();
    expect(await repository.findContent(first.id)).toBeUndefined();
    expect(await repository.delete(first.id)).toBeUndefined();
  });

  it("should round-trip the scene and the thumbnail", async () => {
    // given
    const drawing = TestFixture.drawing();
    const scene = TestFixture.scene("Browser", "SQLite");

    // when
    await repository.create(drawing, { drawingId: drawing.id, scene });
    // then
    expect(await repository.findContent(drawing.id)).toEqual({ drawingId: drawing.id, scene, thumbnail: undefined });

    // when
    const withThumbnail = await repository.updateContent(drawing.id, { thumbnail: TestFixture.PNG });
    // then (the scene is untouched)
    expect(withThumbnail?.scene).toEqual(scene);
    expect(withThumbnail?.thumbnail).toEqual(TestFixture.PNG);

    // when
    const cleared = await repository.updateContent(drawing.id, { scene: TestFixture.scene("Changed"), thumbnail: undefined });
    // then
    expect(cleared?.scene).toEqual(TestFixture.scene("Changed"));
    expect(cleared?.thumbnail).toBeUndefined();
    expect(await repository.updateContent("does-not-exist", { scene })).toBeUndefined();
  });

  it("should keep a stable order when two drawings share a timestamp", async () => {
    // given (the same instant, as a coarse clock hands out; ids are time-ordered)
    const created = Temporal.Now.instant();
    const first = TestFixture.drawing({ name: "First", created });
    const second = TestFixture.drawing({ name: "Second", created });
    await repository.create(second, { drawingId: second.id, scene: TestFixture.scene() });
    await repository.create(first, { drawingId: first.id, scene: TestFixture.scene() });

    // then
    expect((await repository.list()).map((d) => d.name)).toEqual(["First", "Second"]);
  });

  it("should keep sibling names unique, ignoring case, at the top level too", async () => {
    // given
    const folder = TestFixture.folder();
    await context.folderRepository.create(folder);
    const top = TestFixture.drawing({ name: "Overview" });
    await repository.create(top, { drawingId: top.id, scene: TestFixture.scene() });

    // then
    const dupe = TestFixture.drawing({ name: "overview" });
    expect(repository.create(dupe, { drawingId: dupe.id, scene: TestFixture.scene() })).rejects.toBeInstanceOf(PersistenceError);
    const inFolder = TestFixture.drawing({ name: "Overview", folderId: folder.id });
    expect(await repository.create(inFolder, { drawingId: inFolder.id, scene: TestFixture.scene() })).toBeDefined();

    // when (a rename onto a sibling, and a move next to a namesake)
    expect(repository.update(inFolder.id, { name: "Overview", folderId: undefined })).rejects.toBeInstanceOf(PersistenceError);
  });

  it("should refuse a folder that does not exist", async () => {
    // when
    const drawing = TestFixture.drawing({ folderId: Bun.randomUUIDv7() });
    const action = () => repository.create(drawing, { drawingId: drawing.id, scene: TestFixture.scene() });
    // then (the foreign key is enforced)
    expect(action()).rejects.toThrow();
  });
});
