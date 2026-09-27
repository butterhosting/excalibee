import { DrawingError } from "@/errors/DrawingError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Drawing } from "@/models/Drawing";
import { DrawingScene } from "@/models/DrawingScene";
import { DrawingRepository } from "@/repositories/DrawingRepository";
import { FolderRepository } from "@/repositories/FolderRepository";
import { PersistenceError } from "@/repositories/error/PersistenceError";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

export class DrawingService {
  public constructor(
    private readonly drawingRepository: DrawingRepository,
    private readonly folderRepository: FolderRepository,
  ) {}

  public async list(): Promise<Drawing[]> {
    return await this.drawingRepository.list();
  }

  public async find(id: string): Promise<Drawing> {
    const drawing = await this.drawingRepository.find(id);
    if (!drawing) {
      throw DrawingError.not_found({ id });
    }
    return drawing;
  }

  public async create(unknown: z.output<typeof DrawingService.Create>): Promise<Drawing> {
    const { name, folderId } = DrawingService.Create.parse(unknown);
    if (folderId) {
      await this.ensureFolderExists(folderId);
    }
    const id = Bun.randomUUIDv7();
    return await this.drawingRepository
      .create(
        {
          id,
          object: "drawing",
          name,
          folderId,
          searchText: "",
          created: Temporal.Now.instant(),
        },
        { drawingId: id, scene: DrawingScene.EMPTY },
      )
      .catch((err) => {
        throw DrawingService.nameTakenOr(err, name);
      });
  }

  public async update(id: string, unknown: z.output<typeof DrawingService.Update>): Promise<Drawing> {
    const { name, folderId } = DrawingService.Update.parse(unknown);
    const update: Partial<Drawing> = { updated: Temporal.Now.instant() };
    if (name !== undefined) {
      update.name = name;
    }
    if (folderId !== undefined) {
      if (folderId) {
        await this.ensureFolderExists(folderId);
      }
      update.folderId = folderId || undefined;
    }
    // a move can collide just like a rename: the name has to be free among its new siblings
    const drawing = await this.drawingRepository.update(id, update).catch(async (err) => {
      throw DrawingService.nameTakenOr(err, name ?? (await this.find(id)).name);
    });
    if (!drawing) {
      throw DrawingError.not_found({ id });
    }
    return drawing;
  }

  public async delete(id: string): Promise<Drawing> {
    const drawing = await this.drawingRepository.delete(id);
    if (!drawing) {
      throw DrawingError.not_found({ id });
    }
    return drawing;
  }

  public async getScene(id: string): Promise<DrawingScene> {
    const content = await this.drawingRepository.findContent(id);
    if (!content) {
      throw DrawingError.not_found({ id });
    }
    return content.scene;
  }

  public async saveScene(id: string, unknown: z.output<typeof DrawingService.SaveScene>): Promise<Drawing> {
    const { scene, thumbnail } = DrawingService.SaveScene.parse(unknown);
    // `null` clears the thumbnail (the drawing was emptied), leaving it out keeps the current one
    const content = await this.drawingRepository.updateContent(id, {
      scene,
      ...(thumbnail === undefined ? {} : { thumbnail: thumbnail ? DrawingService.decodeThumbnail(thumbnail) : undefined }),
    });
    if (!content) {
      throw DrawingError.not_found({ id });
    }
    const drawing = await this.drawingRepository.update(id, {
      searchText: DrawingScene.extractText(scene),
      updated: Temporal.Now.instant(),
    });
    if (!drawing) {
      throw DrawingError.not_found({ id });
    }
    return drawing;
  }

  public async getThumbnail(id: string): Promise<Uint8Array> {
    const content = await this.drawingRepository.findContent(id);
    if (!content) {
      throw DrawingError.not_found({ id });
    }
    if (!content.thumbnail) {
      throw DrawingError.no_thumbnail({ id });
    }
    return content.thumbnail;
  }

  private async ensureFolderExists(folderId: string) {
    if (!(await this.folderRepository.find(folderId))) {
      throw DrawingError.folder_not_found({ folderId });
    }
  }
}

export namespace DrawingService {
  export function nameTakenOr(err: unknown, name: string): unknown {
    return PersistenceError.isUniqueViolation(err) ? DrawingError.name_taken({ name }) : err;
  }

  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

  const name = z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0);

  export const Create = z
    .object({
      name,
      folderId: z.uuid().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });

  /**
   * `folderId: null` moves the drawing to the top level; leaving it out keeps the current folder.
   */
  export const Update = z
    .object({
      name: name.optional(),
      folderId: z.uuid().nullable().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });

  /**
   * The thumbnail travels as base64 PNG inside the JSON body: it is ~15 kB, which is not worth a multipart round trip.
   */
  export const SaveScene = z
    .object({
      scene: DrawingScene.parse.SCHEMA,
      thumbnail: z.string().nullable().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });

  export function decodeThumbnail(base64: string): Uint8Array {
    const bytes = Uint8Array.fromBase64(base64.replace(/^data:image\/png;base64,/, ""));
    if (!PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) {
      throw DrawingError.invalid_thumbnail();
    }
    return bytes;
  }
}
