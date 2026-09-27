import { Drawing } from "@/models/Drawing";
import { Folder } from "@/models/Folder";
import { ReactNode } from "react";
import { DeleteModal } from "../comps/DeleteModal";
import { DialogManager } from "../comps/DialogManager";
import { MoveModal } from "../comps/MoveModal";
import { NameModal } from "../comps/NameModal";
import { DrawingClient } from "./DrawingClient";
import { FolderClient } from "./FolderClient";

export class DialogClient {
  private _manager: DialogManager.Api | null = null;

  public constructor(
    private readonly folderClient: FolderClient,
    private readonly drawingClient: DrawingClient,
  ) {}

  private get manager() {
    if (!this._manager) throw new Error(`Must initialize the ${DialogClient.name} before use`);
    return this._manager;
  }

  public initialize(manager: DialogManager.Api | null) {
    this._manager = manager;
  }

  public folderCreate(parentId?: string): Promise<"cancel" | Folder> {
    return this.open<Folder>((resolve) => (
      <NameModal
        title="New folder"
        label="Name"
        placeholder="E.g.: Projects"
        submitLabel="Create folder"
        submit={(name) => this.folderClient.create({ name, parentId })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public folderRename(folder: Folder): Promise<"cancel" | Folder> {
    return this.open<Folder>((resolve) => (
      <NameModal
        title="Rename folder"
        label="Name"
        placeholder={folder.name}
        initial={folder.name}
        submitLabel="Rename"
        submit={(name) => this.folderClient.update(folder.id, { name })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public folderMove(folder: Folder, folders: Folder[]): Promise<"cancel" | Folder> {
    const descendants = new Set<string>([folder.id]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => {
        if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
          descendants.add(f.id);
          grew = true;
        }
      });
    }
    return this.open<Folder>((resolve) => (
      <MoveModal
        title={`Move “${folder.name}” to…`}
        folders={folders}
        currentParentId={folder.parentId}
        disabled={(id) => descendants.has(id)}
        perform={(parentId) => this.folderClient.update(folder.id, { parentId })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public folderDelete(folder: Folder, contents: { folders: number; drawings: number }): Promise<"cancel" | Folder> {
    const inside = [
      contents.folders > 0 && `${contents.folders} ${contents.folders === 1 ? "folder" : "folders"}`,
      contents.drawings > 0 && `${contents.drawings} ${contents.drawings === 1 ? "drawing" : "drawings"}`,
    ].filter(Boolean);
    return this.open<Folder>((resolve) => (
      <DeleteModal
        title={`Delete folder “${folder.name}”?`}
        body={
          inside.length
            ? `This folder contains ${inside.join(" and ")}. Everything inside is deleted with it. There is no trash, so this cannot be undone.`
            : "The folder is empty. There is no trash, so this cannot be undone."
        }
        actionLabel={inside.length ? "Delete folder and contents" : "Delete folder"}
        perform={() => this.folderClient.delete(folder.id)}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public drawingCreate(folderId?: string): Promise<"cancel" | Drawing> {
    return this.open<Drawing>((resolve) => (
      <NameModal
        title="New drawing"
        label="Name"
        placeholder="E.g.: Architecture overview"
        submitLabel="Create and open"
        submit={(name) => this.drawingClient.create({ name, folderId })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public drawingRename(drawing: Drawing): Promise<"cancel" | Drawing> {
    return this.open<Drawing>((resolve) => (
      <NameModal
        title="Rename drawing"
        label="Name"
        placeholder={drawing.name}
        initial={drawing.name}
        submitLabel="Rename"
        submit={(name) => this.drawingClient.update(drawing.id, { name })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public drawingMove(drawing: Drawing, folders: Folder[]): Promise<"cancel" | Drawing> {
    return this.open<Drawing>((resolve) => (
      <MoveModal
        title={`Move “${drawing.name}” to…`}
        folders={folders}
        currentParentId={drawing.folderId}
        perform={(folderId) => this.drawingClient.update(drawing.id, { folderId })}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  public drawingDelete(drawing: Drawing): Promise<"cancel" | Drawing> {
    return this.open<Drawing>((resolve) => (
      <DeleteModal
        title={`Delete “${drawing.name}”?`}
        body="The drawing is removed from this server for everyone. There is no trash, so this cannot be undone."
        actionLabel="Delete drawing"
        perform={() => this.drawingClient.delete(drawing.id)}
        close={() => resolve("cancel")}
        done={resolve}
      />
    ));
  }

  private open<T>(render: (resolve: (result: "cancel" | T) => void) => ReactNode): Promise<"cancel" | T> {
    const { promise, resolve: internalResolve } = Promise.withResolvers<"cancel" | T>();
    const resolve = (result: "cancel" | T) => {
      internalResolve(result);
      this.manager.remove({ token });
    };
    const { token } = this.manager.insert(render(resolve));
    return promise;
  }
}
