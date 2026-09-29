import { expect, Page } from "@playwright/test";

export namespace EditorFlow {
  /**
   * Created from the library, so the editor is reached by in-app navigation and the browser's back button stays in the app
   */
  export async function create(page: Page, name: string): Promise<string> {
    await page.getByTestId("new-drawing").click();
    await page.getByTestId("name-input").fill(name);
    await page.getByRole("button", { name: "Create and open" }).click();
    await expect(page).toHaveURL(/\/drawings\/[0-9a-f-]+$/);
    await expect(page.getByTestId("save-status")).toHaveText("Saved");
    return page.url().split("/").pop()!;
  }

  /**
   * Clear of the style panel that Excalidraw opens on the left while a tool is picked or a shape selected, which would
   * swallow the drag and the focusing click; the click lands on empty canvas, which also deselects
   */
  export async function drawRectangle(page: Page, x: number, y: number) {
    const canvas = page.locator(".excalidraw__canvas.interactive");
    const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width - 60, y: box.height / 2 } });
    await page.keyboard.press("2");
    await page.mouse.move(box.x + x, box.y + y);
    await page.mouse.down();
    await page.mouse.move(box.x + x + 200, box.y + y + 120, { steps: 5 });
    await page.mouse.up();
  }

  /**
   * A first rectangle that is autosaved, and a second one that has not been yet: whatever happens next decides its fate
   */
  export async function drawWithUnsavedChange(page: Page) {
    await drawRectangle(page, 300, 300);
    await expect(page.getByTestId("save-status")).toHaveText("Unsaved changes");
    await expect(page.getByTestId("save-status")).toHaveText("Saved", { timeout: 8_000 });
    await drawRectangle(page, 600, 300);
    await expect(page.getByTestId("save-status")).toHaveText("Unsaved changes");
  }

  export async function storedElementCount(page: Page, id: string): Promise<number> {
    const scene = await (await page.request.get(`/internal-api/drawings/${id}/scene`)).json();
    return scene.elements.filter((e: { isDeleted?: boolean }) => !e.isDeleted).length;
  }
}
