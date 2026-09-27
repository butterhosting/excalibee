import { Page } from "@playwright/test";

export namespace AppBoundary {
  export async function purge(page: Page) {
    await page.request.post("/internal-api/restricted/purge", { failOnStatusCode: true });
  }
}
