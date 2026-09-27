import { expect, Page } from "@playwright/test";

export namespace LibraryFlow {
  export async function createFolder(page: Page, name: string) {
    await page.getByTestId("new-folder").click();
    await page.getByTestId("name-input").fill(name);
    await page.getByRole("button", { name: "Create folder" }).click();
    await expect(page.getByTestId("folder-card").filter({ hasText: name })).toBeVisible();
  }

  export async function openMenu(page: Page, name: string) {
    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    // clicks still land on a clipped menu, so this is the one check that would catch a card cutting it off
    await expect(page.getByRole("menu")).toBeInViewport({ ratio: 1 });
  }

  export async function rename(page: Page, name: string, nextName: string) {
    await openMenu(page, name);
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByTestId("name-input").fill(nextName);
    await page.getByRole("button", { name: "Rename" }).click();
    await expect(page.getByText(nextName, { exact: true })).toBeVisible();
  }

  export async function remove(page: Page, name: string) {
    await openMenu(page, name);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
}
