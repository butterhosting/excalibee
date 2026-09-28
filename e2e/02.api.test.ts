import { expect, test } from "@playwright/test";
import { AppBoundary } from "./boundaries/AppBoundary";

// a 1×1 transparent png
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test.beforeEach(async ({ page }) => {
  await AppBoundary.purge(page);
});

test("the drawings api stores the scene, indexes its text and serves the thumbnail", async ({ page }) => {
  // when
  const created = await page.request.post("/internal-api/drawings", { data: { name: "Architecture" } });
  // then
  expect(created.status()).toEqual(200);
  const drawing = await created.json();
  expect(drawing).toEqual(expect.objectContaining({ object: "drawing", name: "Architecture", searchText: "" }));
  expect(await (await page.request.get(`/internal-api/drawings/${drawing.id}/scene`)).json()).toEqual({ elements: [], appState: {}, files: {} });
  expect((await page.request.get(`/internal-api/drawings/${drawing.id}/thumbnail`)).status()).toEqual(404);

  // when
  const scene = { elements: [{ id: "t1", type: "text", text: "Excalibee API", isDeleted: false }], appState: { zoom: { value: 1 } }, files: {} };
  const saved = await page.request.put(`/internal-api/drawings/${drawing.id}/scene`, { data: { scene, thumbnail: PNG } });
  // then
  expect(await saved.json()).toEqual(expect.objectContaining({ id: drawing.id, searchText: "Excalibee API", updated: expect.any(String) }));
  expect(await (await page.request.get(`/internal-api/drawings/${drawing.id}/scene`)).json()).toEqual(scene);
  const thumbnail = await page.request.get(`/internal-api/drawings/${drawing.id}/thumbnail`);
  expect(thumbnail.status()).toEqual(200);
  expect(thumbnail.headers()["content-type"]).toEqual("image/png");
  expect((await thumbnail.body()).toString("base64")).toEqual(PNG);

  // when
  const deleted = await page.request.delete(`/internal-api/drawings/${drawing.id}`);
  // then
  expect(deleted.status()).toEqual(200);
  expect(await (await page.request.get("/internal-api/drawings")).json()).toEqual([]);
  expect((await page.request.get(`/internal-api/drawings/${drawing.id}/scene`)).status()).toEqual(404);
});

test("the folders api nests, refuses cycles and cascades deletes", async ({ page }) => {
  // given
  const root = await (await page.request.post("/internal-api/folders", { data: { name: "Projects" } })).json();
  const child = await (await page.request.post("/internal-api/folders", { data: { name: "Website", parentId: root.id } })).json();
  const drawing = await (await page.request.post("/internal-api/drawings", { data: { name: "Intro", folderId: child.id } })).json();

  // when (a cycle)
  const cycle = await page.request.patch(`/internal-api/folders/${root.id}`, { data: { parentId: child.id } });
  // then
  expect(cycle.status()).toEqual(400);
  expect(await cycle.json()).toEqual({ problem: "FolderError::circular_move", details: { id: root.id, parentId: child.id } });

  // when (a sibling with the same name, in another case)
  const dupe = await page.request.post("/internal-api/drawings", { data: { name: "intro", folderId: child.id } });
  // then
  expect(dupe.status()).toEqual(409);
  expect(await dupe.json()).toEqual({ problem: "DrawingError::name_taken", details: { name: "intro" } });

  // when (a rejected thumbnail)
  const bad = await page.request.put(`/internal-api/drawings/${drawing.id}/scene`, { data: { scene: { elements: [], appState: {}, files: {} }, thumbnail: btoa("nope") } });
  // then
  expect(bad.status()).toEqual(400);
  expect(await bad.json()).toEqual({ problem: "DrawingError::invalid_thumbnail", details: {} });

  // when
  const deleted = await page.request.delete(`/internal-api/folders/${root.id}`);
  // then (subfolder and drawing went with it)
  expect(deleted.status()).toEqual(200);
  expect(await (await page.request.get("/internal-api/folders")).json()).toEqual([]);
  expect(await (await page.request.get("/internal-api/drawings")).json()).toEqual([]);
});
