import { expect, Page, test } from "@playwright/test";
import { AppBoundary } from "./boundaries/AppBoundary";
import { EditorFlow } from "./flows/EditorFlow";

test.beforeEach(async ({ page }) => {
  await AppBoundary.purge(page);
  await page.goto("");
});

/**
 * Leaving the editor used to let the pending autosave fire after Excalidraw had emptied its scene, storing a blank drawing a
 * moment later; so a count that is right at first is checked again once that autosave would have fired
 */
async function expectStoredElements(page: Page, id: string, count: number) {
  await expect.poll(() => EditorFlow.storedElementCount(page, id)).toEqual(count);
  await page.waitForTimeout(2_000);
  expect(await EditorFlow.storedElementCount(page, id)).toEqual(count);
}

function recordPrompts(page: Page): string[] {
  const prompts: string[] = [];
  page.on("dialog", (dialog) => {
    prompts.push(dialog.type());
    dialog.accept();
  });
  return prompts;
}

test("an edit made right before following the library link is saved", async ({ page }) => {
  // given
  const id = await EditorFlow.create(page, "Architecture");
  await EditorFlow.drawWithUnsavedChange(page);
  // when
  await page.getByRole("link", { name: "Library" }).click();
  // then
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Architecture" })).toBeVisible();
  await expectStoredElements(page, id, 2);
});

test("an edit made right before going back to the library is saved", async ({ page }) => {
  // given
  const id = await EditorFlow.create(page, "Architecture");
  await EditorFlow.drawWithUnsavedChange(page);
  // when
  await page.goBack();
  // then
  await expect(page.getByTestId("drawing-card").filter({ hasText: "Architecture" })).toBeVisible();
  await expectStoredElements(page, id, 2);
});

test("an edit made right before reloading is saved, without asking to leave", async ({ page }) => {
  // given
  const prompts = recordPrompts(page);
  const id = await EditorFlow.create(page, "Architecture");
  await EditorFlow.drawWithUnsavedChange(page);
  // when
  await page.reload();
  // then
  await expectStoredElements(page, id, 2);
  expect(prompts).toEqual([]);
});

test("an edit made right before closing the tab is saved, without asking to leave", async ({ page, context }) => {
  // given
  const prompts = recordPrompts(page);
  const id = await EditorFlow.create(page, "Architecture");
  await EditorFlow.drawWithUnsavedChange(page);
  // when
  await page.close({ runBeforeUnload: true });
  // then
  await expectStoredElements(await context.newPage(), id, 2);
  expect(prompts).toEqual([]);
});

test("a scene too large to send while unloading still asks before leaving", async ({ page }) => {
  // given (well past the 64 KiB a keepalive request may carry, once Excalidraw has filled in each element)
  const id = await EditorFlow.create(page, "Architecture");
  const elements = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, type: "rectangle", x: (i % 20) * 60, y: Math.floor(i / 20) * 60, width: 40, height: 40 }));
  await page.request.put(`/internal-api/drawings/${id}/scene`, { data: { scene: { elements, appState: {}, files: {} } }, failOnStatusCode: true });
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  const prompts = recordPrompts(page);
  await EditorFlow.drawRectangle(page, 300, 300);
  await expect(page.getByTestId("save-status")).toHaveText("Unsaved changes");
  // when
  await page.reload();
  // then
  expect(prompts).toEqual(["beforeunload"]);
});
