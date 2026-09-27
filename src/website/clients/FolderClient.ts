import { Folder } from "@/models/Folder";
import { Yesttp } from "yesttp";

export class FolderClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async list(): Promise<Folder[]> {
    const { json } = await this.yesttp.get<unknown[]>("/folders");
    return json.map(Folder.parse);
  }

  public async create(data: FolderClient.Create): Promise<Folder> {
    const { json } = await this.yesttp.post<unknown>("/folders", { body: data });
    return Folder.parse(json);
  }

  public async update(id: string, data: FolderClient.Update): Promise<Folder> {
    const { json } = await this.yesttp.patch<unknown>(`/folders/${id}`, { body: data });
    return Folder.parse(json);
  }

  public async delete(id: string): Promise<Folder> {
    const { json } = await this.yesttp.delete(`/folders/${id}`);
    return Folder.parse(json);
  }
}

export namespace FolderClient {
  export type Create = { name: string; parentId?: string };
  export type Update = { name?: string; parentId?: string | null };
}
