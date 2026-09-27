import { FolderConverter } from "@/drizzle/converters/FolderConverter";
import { $folder } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { Folder } from "@/models/Folder";
import { eq } from "drizzle-orm";
import { PersistenceError } from "./error/PersistenceError";

export class FolderRepository {
  public constructor(private readonly sqlite: Sqlite) {}

  public async list(): Promise<Folder[]> {
    const folders = await this.sqlite.query.$folder.findMany({
      orderBy: $folder.name,
    });
    return folders.map((folder) => FolderConverter.fromDatabase(folder));
  }

  public async find(id: string): Promise<Folder | undefined> {
    const folder = await this.sqlite.query.$folder.findFirst({
      where: eq($folder.id, id),
    });
    return folder ? FolderConverter.fromDatabase(folder) : undefined;
  }

  public async create(folder: Folder): Promise<Folder> {
    return await this.sqlite
      .insert($folder)
      .values(FolderConverter.toDatabase(folder))
      .then(
        () => folder,
        (err) => {
          throw PersistenceError.tryCast(err);
        },
      );
  }

  public async update(id: string, update: Partial<Folder>): Promise<Folder | undefined> {
    const [folder] = await this.sqlite
      .update($folder)
      .set(FolderConverter.toDatabase(update))
      .where(eq($folder.id, id))
      .returning()
      .catch((err) => {
        throw PersistenceError.tryCast(err);
      });
    return folder ? FolderConverter.fromDatabase(folder) : undefined;
  }

  /**
   * Subfolders and drawings go with it: the DDL cascades
   */
  public async delete(id: string): Promise<Folder | undefined> {
    const [folder] = await this.sqlite.delete($folder).where(eq($folder.id, id)).returning();
    return folder ? FolderConverter.fromDatabase(folder) : undefined;
  }
}
