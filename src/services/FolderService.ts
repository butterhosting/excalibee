import { FolderError } from "@/errors/FolderError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Folder } from "@/models/Folder";
import { FolderRepository } from "@/repositories/FolderRepository";
import { PersistenceError } from "@/repositories/error/PersistenceError";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

export class FolderService {
  public constructor(private readonly folderRepository: FolderRepository) {}

  public async list(): Promise<Folder[]> {
    return await this.folderRepository.list();
  }

  public async find(id: string): Promise<Folder> {
    const folder = await this.folderRepository.find(id);
    if (!folder) {
      throw FolderError.not_found({ id });
    }
    return folder;
  }

  public async create(unknown: z.output<typeof FolderService.Create>): Promise<Folder> {
    const { name, parentId } = FolderService.Create.parse(unknown);
    if (parentId) {
      await this.ensureParentExists(parentId);
    }
    return await this.folderRepository
      .create({
        id: Bun.randomUUIDv7(),
        object: "folder",
        name,
        parentId,
        created: Temporal.Now.instant(),
      })
      .catch((err) => {
        throw FolderService.nameTakenOr(err, name);
      });
  }

  public async update(id: string, unknown: z.output<typeof FolderService.Update>): Promise<Folder> {
    const { name, parentId } = FolderService.Update.parse(unknown);
    const update: Partial<Folder> = { updated: Temporal.Now.instant() };
    if (name !== undefined) {
      update.name = name;
    }
    if (parentId !== undefined) {
      if (parentId) {
        await this.ensureParentExists(parentId);
        if (await this.isSelfOrDescendant(id, parentId)) {
          throw FolderError.circular_move({ id, parentId });
        }
      }
      update.parentId = parentId || undefined;
    }
    // a move can collide just like a rename: the name has to be free among its new siblings
    const folder = await this.folderRepository.update(id, update).catch(async (err) => {
      throw FolderService.nameTakenOr(err, name ?? (await this.find(id)).name);
    });
    if (!folder) {
      throw FolderError.not_found({ id });
    }
    return folder;
  }

  public async delete(id: string): Promise<Folder> {
    const folder = await this.folderRepository.delete(id);
    if (!folder) {
      throw FolderError.not_found({ id });
    }
    return folder;
  }

  private async ensureParentExists(parentId: string) {
    if (!(await this.folderRepository.find(parentId))) {
      throw FolderError.parent_not_found({ parentId });
    }
  }

  private async isSelfOrDescendant(id: string, candidateId: string): Promise<boolean> {
    const byId = new Map((await this.folderRepository.list()).map((folder) => [folder.id, folder]));
    let current: string | undefined = candidateId;
    while (current) {
      if (current === id) {
        return true;
      }
      current = byId.get(current)?.parentId;
    }
    return false;
  }
}

export namespace FolderService {
  export function nameTakenOr(err: unknown, name: string): unknown {
    return PersistenceError.isUniqueViolation(err) ? FolderError.name_taken({ name }) : err;
  }

  const name = z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0);

  export const Create = z
    .object({
      name,
      parentId: z.uuid().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });

  /**
   * `parentId: null` moves the folder to the top level; leaving it out keeps the current parent.
   */
  export const Update = z
    .object({
      name: name.optional(),
      parentId: z.uuid().nullable().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
