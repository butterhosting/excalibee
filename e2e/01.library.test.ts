import { expect, test } from "@playwright/test";
import { AppBoundary } from "./boundaries/AppBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { LibraryFlow } from "./flows/LibraryFlow";

test.beforeEach(async ({ page }) => {
  await AppBoundary.purge(page);
  await page.goto("");
});

test("folders can be created, renamed, nested and deleted with their contents", async ({ page }) => {
  // when (typed key by key: a keystroke once closed the dialog)
  await page.getByTestId("new-folder").click();
  await page.getByTestId("name-input").pressSequentially("Projects");
  await page.getByRole("button", { name: "Create folder" }).click();
  await expect(page.getByTestId("folder-card").filter({ hasText: "Projects" })).toBeVisible();
  // then
  const projects = page.getByTestId("folder-card").filter({ hasText: "Projects" });
  await expect(projects).toBeVisible();
  await expect(projects).toContainText("Empty");

  // when (a subfolder, inside)
  await projects.click();
  await expect(page.getByTestId("library-title")).toHaveText("Projects");
  await LibraryFlow.createFolder(page, "Website");
  await LibraryFlow.rename(page, "Website", "Site");
  // then
  await expect(page.getByTestId("folder-card").filter({ hasText: "Site" })).toBeVisible();

  // when (back at the top; the card counts drawings in the whole subtree, and there are none)
  await page.goto("");
  await expect(projects).toContainText("Empty");
  await LibraryFlow.remove(page, "Projects");
  // then
  await expect(page.getByTestId("folder-card")).toHaveCount(0);
});

test("a drawing is created, opened in the editor, autosaved and shown with a thumbnail", async ({ page }) => {
  // when
  await page.getByTestId("new-drawing").click();
  await page.getByTestId("name-input").fill("Architecture");
  await page.getByRole("button", { name: "Create and open" }).click();
  // then
  await expect(page).toHaveURL(/\/drawings\/[0-9a-f-]+$/);
  await expect(page.getByTestId("drawing-title")).toContainText("Architecture");
  await expect(page.getByTestId("save-status")).toContainText("Saved");

  // when
  await EditorFlow.drawRectangle(page, 300, 300);
  // then (the debounced autosave kicks in)
  await expect(page.getByTestId("save-status")).toContainText("Unsaved");
  await expect(page.getByTestId("save-status")).toContainText("Saved", { timeout: 8_000 });

  // when
  await page.getByRole("link", { name: "Library" }).click();
  // then (the thumbnail the browser rendered is served back)
  const card = page.getByTestId("drawing-card").filter({ hasText: "Architecture" });
  await expect(card).toBeVisible();
  const thumbnail = card.locator("img");
  await expect(thumbnail).toBeVisible();
  await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // when
  await LibraryFlow.rename(page, "Architecture", "Overview");
  await LibraryFlow.remove(page, "Overview");
  // then
  await expect(page.getByTestId("drawing-card")).toHaveCount(0);
});

test("drawings can be moved between folders", async ({ page }) => {
  // given
  await LibraryFlow.createFolder(page, "Projects");
  await page.getByTestId("new-drawing").click();
  await page.getByTestId("name-input").fill("Intro");
  await page.getByRole("button", { name: "Create and open" }).click();
  await page.getByRole("link", { name: "Library" }).click();

  // when
  await LibraryFlow.openMenu(page, "Intro");
  await page.getByRole("menuitem", { name: "Move to…" }).click();
  await page.getByTestId("move-target").filter({ hasText: "Projects" }).click();
  await page.getByTestId("confirm-move").click();
  // then
  await expect(page.getByTestId("drawing-card")).toHaveCount(0);
  await page.getByTestId("folder-card").filter({ hasText: "Projects" }).click();
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Intro" })).toBeVisible();
});

test("drawings and folders can be dragged onto folders and onto the breadcrumb", async ({ page }) => {
  // given
  const projects = await (await page.request.post("/internal-api/folders", { data: { name: "Projects" } })).json();
  await page.request.post("/internal-api/folders", { data: { name: "Archive" } });
  await page.request.post("/internal-api/drawings", { data: { name: "Intro" } });
  await page.reload();

  // when (a drawing onto a folder)
  await page.getByTestId("drawing-card").filter({ hasText: "Intro" }).dragTo(page.getByTestId("folder-card").filter({ hasText: "Projects" }));
  // then
  await expect(page.getByTestId("drawing-card")).toHaveCount(0);

  // when (a folder onto a folder)
  await page.getByTestId("folder-card").filter({ hasText: "Archive" }).dragTo(page.getByTestId("folder-card").filter({ hasText: "Projects" }));
  // then
  await expect(page.getByTestId("folder-card")).toHaveCount(1);
  await page.goto(`folders/${projects.id}`);
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Intro" })).toBeVisible();
  await expect(page.getByTestId("folder-card").filter({ hasText: "Archive" })).toBeVisible();

  // when (down into the subfolder, then back up one level via the breadcrumb)
  await page.getByTestId("drawing-card").filter({ hasText: "Intro" }).dragTo(page.getByTestId("folder-card").filter({ hasText: "Archive" }));
  await page.getByTestId("folder-card").filter({ hasText: "Archive" }).click();
  await page.getByTestId("drawing-card").filter({ hasText: "Intro" }).dragTo(page.getByTestId("breadcrumb").getByRole("link", { name: "Projects" }));
  // then
  await expect(page.getByTestId("drawing-card")).toHaveCount(0);
  await page.goto(`folders/${projects.id}`);
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Intro" })).toBeVisible();

  // when (all the way up, via the root crumb)
  await page.getByTestId("drawing-card").filter({ hasText: "Intro" }).dragTo(page.getByTestId("breadcrumb").getByRole("link", { name: "Library" }));
  // then
  await expect(page.getByTestId("drawing-card")).toHaveCount(0);
  await page.goto("");
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Intro" })).toBeVisible();
});
