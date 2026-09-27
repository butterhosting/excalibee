import { DrawingConverter } from "@/drizzle/converters/DrawingConverter";
import { $drawing, $drawingContent } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { Drawing } from "@/models/Drawing";
import { DrawingContent } from "@/models/DrawingContent";
import { eq } from "drizzle-orm";
import { PersistenceError } from "./error/PersistenceError";

export class DrawingRepository {
  public constructor(private readonly sqlite: Sqlite) {}

  public async list(): Promise<Drawing[]> {
    // two rows can share a `created` when the clock is coarse (it happened on a CI runner), so the time-ordered id decides
    const drawings = await this.sqlite.query.$drawing.findMany({
      orderBy: [$drawing.created, $drawing.id],
    });
    return drawings.map((drawing) => DrawingConverter.fromDatabase(drawing));
  }

  public async find(id: string): Promise<Drawing | undefined> {
    const drawing = await this.sqlite.query.$drawing.findFirst({
      where: eq($drawing.id, id),
    });
    return drawing ? DrawingConverter.fromDatabase(drawing) : undefined;
  }

  public async create(drawing: Drawing, content: DrawingContent): Promise<Drawing> {
    await this.sqlite
      .insert($drawing)
      .values(DrawingConverter.toDatabase(drawing))
      .catch((err) => {
        throw PersistenceError.tryCast(err);
      });
    await this.sqlite.insert($drawingContent).values(DrawingConverter.contentToDatabase(content));
    return drawing;
  }

  public async update(id: string, update: Partial<Drawing>): Promise<Drawing | undefined> {
    const [drawing] = await this.sqlite
      .update($drawing)
      .set(DrawingConverter.toDatabase(update))
      .where(eq($drawing.id, id))
      .returning()
      .catch((err) => {
        throw PersistenceError.tryCast(err);
      });
    return drawing ? DrawingConverter.fromDatabase(drawing) : undefined;
  }

  public async delete(id: string): Promise<Drawing | undefined> {
    const [drawing] = await this.sqlite.delete($drawing).where(eq($drawing.id, id)).returning();
    return drawing ? DrawingConverter.fromDatabase(drawing) : undefined;
  }

  public async findContent(id: string): Promise<DrawingContent | undefined> {
    const content = await this.sqlite.query.$drawingContent.findFirst({
      where: eq($drawingContent.drawingId, id),
    });
    return content ? DrawingConverter.contentFromDatabase(content) : undefined;
  }

  public async updateContent(id: string, update: Partial<DrawingContent>): Promise<DrawingContent | undefined> {
    const [content] = await this.sqlite
      .update($drawingContent)
      .set(DrawingConverter.contentToDatabase(update))
      .where(eq($drawingContent.drawingId, id))
      .returning();
    return content ? DrawingConverter.contentFromDatabase(content) : undefined;
  }
}
