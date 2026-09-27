import { DrawingService } from "./DrawingService";
import { FolderService } from "./FolderService";

export class RestrictedService {
  public constructor(
    private readonly folderService: FolderService,
    private readonly drawingService: DrawingService,
  ) {}

  public async purge(): Promise<void> {
    const folders = await this.folderService.list();
    await Promise.all(folders.filter(({ parentId }) => !parentId).map(({ id }) => this.folderService.delete(id)));
    const drawings = await this.drawingService.list();
    await Promise.all(drawings.map(({ id }) => this.drawingService.delete(id)));
  }
}
