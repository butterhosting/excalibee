import { Drawing } from "@/models/Drawing";
import { DrawingScene } from "@/models/DrawingScene";
import { Yesttp } from "yesttp";

export class DrawingClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async list(): Promise<Drawing[]> {
    const { json } = await this.yesttp.get<unknown[]>("/drawings");
    return json.map(Drawing.parse);
  }

  public async find(id: string): Promise<Drawing> {
    const { json } = await this.yesttp.get<unknown>(`/drawings/${id}`);
    return Drawing.parse(json);
  }

  public async create(data: DrawingClient.Create): Promise<Drawing> {
    const { json } = await this.yesttp.post<unknown>("/drawings", { body: data });
    return Drawing.parse(json);
  }

  public async update(id: string, data: DrawingClient.Update): Promise<Drawing> {
    const { json } = await this.yesttp.patch<unknown>(`/drawings/${id}`, { body: data });
    return Drawing.parse(json);
  }

  public async delete(id: string): Promise<Drawing> {
    const { json } = await this.yesttp.delete(`/drawings/${id}`);
    return Drawing.parse(json);
  }

  public async getScene(id: string): Promise<DrawingScene> {
    const { json } = await this.yesttp.get<unknown>(`/drawings/${id}/scene`);
    return DrawingScene.parse(json);
  }

  public async saveScene(id: string, data: DrawingClient.SaveScene): Promise<Drawing> {
    const { json } = await this.yesttp.put<unknown>(`/drawings/${id}/scene`, { body: data });
    return Drawing.parse(json);
  }

  /**
   * Keyed on the last update so that the browser cache turns over exactly when the thumbnail does
   */
  public thumbnailUrl({ id, updated, created }: Drawing): string {
    return `/internal-api/drawings/${id}/thumbnail?v=${(updated ?? created).epochMilliseconds}`;
  }
}

export namespace DrawingClient {
  export type Create = { name: string; folderId?: string };
  export type Update = { name?: string; folderId?: string | null };
  export type SaveScene = { scene: DrawingScene; thumbnail?: string | null };
}
