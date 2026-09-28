import { expect, test } from "@playwright/test";
import { AppBoundary } from "./boundaries/AppBoundary";

test.beforeEach(async ({ page }) => {
  await AppBoundary.purge(page);
  await page.goto("");
});

test("the library loads empty and has the right title", async ({ page }) => {
  // then
  await expect(page).toHaveTitle("Library | Excalibee");
  await expect(page.getByTestId("library-title")).toHaveText("Library");
  await expect(page.getByTestId("library-count")).toHaveText("No drawings yet");
  await expect(page.getByTestId("empty")).toBeVisible();
});

test("an unknown route redirects to the library", async ({ page }) => {
  // when
  await page.goto("does-not-exist");
  // then
  await expect(page).toHaveURL(/\/$/);
});

test("folders and drawings created through the api are listed", async ({ page }) => {
  // given (two folders and two drawings at the top level; a third drawing sits in a subfolder)
  const projects = await (await page.request.post("/internal-api/folders", { data: { name: "Projects" } })).json();
  const website = await (await page.request.post("/internal-api/folders", { data: { name: "Website", parentId: projects.id } })).json();
  await page.request.post("/internal-api/folders", { data: { name: "Archive" } });
  await page.request.post("/internal-api/drawings", { data: { name: "System overview" } });
  await page.request.post("/internal-api/drawings", { data: { name: "Onboarding flow" } });
  await page.request.post("/internal-api/drawings", { data: { name: "Payment flow", folderId: website.id } });

  // when
  await page.reload();
  // then
  await expect(page.getByTestId("folder-card")).toHaveCount(2);
  await expect(page.getByTestId("drawing-card")).toHaveCount(2);
  await expect(page.getByTestId("library-count")).toHaveText("3 drawings");

  // when
  await page.getByTestId("folder-card").filter({ hasText: "Projects" }).click();
  await page.getByTestId("folder-card").filter({ hasText: "Website" }).click();
  // then
  await expect(page.getByTestId("library-title")).toHaveText("Website");
  await expect(page.getByTestId("breadcrumb")).toContainText("Library");
  await expect(page.getByTestId("breadcrumb")).toContainText("Projects");
  await expect(page.getByTestId("drawing-card")).toHaveCount(1);
});
