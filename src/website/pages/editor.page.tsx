import { Drawing } from "@/models/Drawing";
import { DrawingScene } from "@/models/DrawingScene";
import { Folder } from "@/models/Folder";
import { Excalidraw, exportToBlob, getSceneVersion, MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useYesQuery } from "react-yesquery";
import { DialogClient } from "../clients/DialogClient";
import { DrawingClient } from "../clients/DrawingClient";
import { FolderClient } from "../clients/FolderClient";
import { Button } from "../comps/Button";
import { Spinner } from "../comps/Spinner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { Icon } from "../images/Icon";
import { Route } from "../Route";

// fonts and locales are served by our own server (see `/excalidraw/*` in Server.ts) instead of Excalidraw's CDN
(window as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = "/excalidraw/";

// the stylesheet comes from there too, linked at runtime: the package only exports it under bundler conditions that Bun
// does not set in production, and a failed HTML bundle is served as an empty page; a `<link>` in index.html would be
// bundled as an asset and fail the same way
const STYLESHEET = "/excalidraw/index.css";
if (!document.querySelector(`link[href="${STYLESHEET}"]`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = STYLESHEET;
  document.head.appendChild(link);
}

const AUTOSAVE_DELAY_MS = 1_500;
const RETRY_DELAY_MS = 5_000;
const THUMBNAIL_MAX_PX = 640;

/**
 * The part of Excalidraw's appState that is worth keeping between sessions; the rest is transient UI
 */
const PERSISTED_APP_STATE = ["viewBackgroundColor", "gridSize", "gridModeEnabled", "zoom", "scrollX", "scrollY", "theme"] as const;

export function editorPage() {
  const { id } = useParams<{ id: string }>();
  const drawingClient = useRegistry(DrawingClient);
  const folderClient = useRegistry(FolderClient);
  const { data, error } = useYesQuery(
    {
      queryFn: async () => {
        const [drawing, scene, folders] = await Promise.all([drawingClient.find(id!), drawingClient.getScene(id!), folderClient.list()]);
        return { drawing, scene, folders };
      },
    },
    [id],
  );
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <span className="text-lg font-semibold">This drawing does not exist</span>
        <Link to={Route.library()} className="text-c-accent-dark font-semibold hover:underline">
          Back to the library
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <Internal.Editor key={data.drawing.id} initialDrawing={data.drawing} scene={data.scene} folders={data.folders} />;
}

namespace Internal {
  type Status = "saved" | "unsaved" | "saving" | "failed";

  type EditorProps = {
    initialDrawing: Drawing;
    scene: DrawingScene;
    folders: Folder[];
  };
  export function Editor({ initialDrawing, scene, folders }: EditorProps) {
    const navigate = useNavigate();
    const drawingClient = useRegistry(DrawingClient);
    const dialogClient = useRegistry(DialogClient);
    const [drawing, setDrawing] = useState(initialDrawing);
    const [status, setStatus] = useState<Status>("saved");
    const api = useRef<ExcalidrawImperativeAPI>(null);
    const savedVersion = useRef<string>(undefined);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useDocumentTitle(`${drawing.name} | Excalibee`);

    const path = (() => {
      const names: string[] = [];
      let cursor = drawing.folderId ? folders.find((f) => f.id === drawing.folderId) : undefined;
      while (cursor) {
        names.unshift(cursor.name);
        cursor = cursor.parentId ? folders.find((f) => f.id === cursor!.parentId) : undefined;
      }
      return names;
    })();

    const versionOf = (a: ExcalidrawImperativeAPI) => `${getSceneVersion(a.getSceneElements())}:${Object.keys(a.getFiles()).length}`;

    const save = async () => {
      const a = api.current;
      if (!a) return;
      clearTimeout(timer.current);
      const version = versionOf(a);
      const elements = a.getSceneElements();
      const appState = a.getAppState();
      const persisted: Record<string, unknown> = {};
      PERSISTED_APP_STATE.forEach((key) => (persisted[key] = appState[key]));
      try {
        setStatus("saving");
        // an emptied canvas clears the thumbnail
        const thumbnail = elements.length
          ? await blobToBase64(
              await exportToBlob({
                elements,
                appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
                files: a.getFiles(),
                mimeType: "image/png",
                getDimensions: (w: number, h: number) => {
                  const scale = Math.min(1, THUMBNAIL_MAX_PX / Math.max(w, h));
                  return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
                },
              }),
            )
          : null;
        const updated = await drawingClient.saveScene(drawing.id, {
          scene: {
            elements: elements as unknown as Record<string, unknown>[],
            appState: persisted,
            files: a.getFiles() as Record<string, unknown>,
          },
          thumbnail,
        });
        savedVersion.current = version;
        setDrawing((d) => ({ ...d, updated: updated.updated }));
        setStatus(versionOf(a) === version ? "saved" : "unsaved");
      } catch {
        setStatus("failed");
        timer.current = setTimeout(save, RETRY_DELAY_MS);
      }
    };

    const onChange = () => {
      const a = api.current;
      if (!a) return;
      if (savedVersion.current === undefined) {
        // the first change event is Excalidraw settling the loaded scene, not the user
        savedVersion.current = versionOf(a);
        return;
      }
      if (versionOf(a) === savedVersion.current) return;
      setStatus((s) => (s === "saving" ? s : "unsaved"));
      clearTimeout(timer.current);
      timer.current = setTimeout(save, AUTOSAVE_DELAY_MS);
    };

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          save();
        }
      };
      const onUnload = (e: BeforeUnloadEvent) => {
        if (status !== "saved") e.preventDefault();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("beforeunload", onUnload);
      return () => {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("beforeunload", onUnload);
      };
    }, [status]);

    async function rename() {
      const result = await dialogClient.drawingRename(drawing);
      if (result !== "cancel") setDrawing((d) => ({ ...d, name: result.name }));
    }
    async function remove() {
      if ((await dialogClient.drawingDelete(drawing)) !== "cancel") {
        savedVersion.current = versionOf(api.current!);
        clearTimeout(timer.current);
        navigate(Route.library(drawing.folderId));
      }
    }

    const initialData: ExcalidrawInitialDataState = {
      elements: scene.elements as unknown as ExcalidrawInitialDataState["elements"],
      appState: scene.appState as ExcalidrawInitialDataState["appState"],
      files: scene.files as ExcalidrawInitialDataState["files"],
      scrollToContent: scene.appState.scrollX === undefined,
    };

    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <div className="h-14 shrink-0 bg-c-paper border-b border-c-line px-4 flex items-center gap-3" data-testid="editor-bar">
          <Link
            to={Route.library(drawing.folderId)}
            className="h-9 px-3 rounded-[10px] bg-white border border-c-line text-sm font-semibold flex items-center gap-2 hover:bg-c-paper outline-c-accent-dark"
          >
            <Icon.ArrowLeft className="size-4" />
            Library
          </Link>
          <div className="flex-1 flex items-center justify-center min-w-0">
            <button
              type="button"
              onClick={rename}
              data-testid="drawing-title"
              className="group flex items-center gap-2 max-w-full px-2 h-9 rounded-lg hover:bg-white cursor-pointer outline-c-accent-dark"
            >
              {path.length > 0 && <span className="text-sm text-c-dark-half truncate">{path.join(" / ")} /</span>}
              <span className="font-semibold truncate">{drawing.name}</span>
              <Icon.Pencil className="size-3.5 text-c-dark-half opacity-60 group-hover:opacity-100 shrink-0" />
            </button>
          </div>
          <span className="flex items-center gap-2 text-sm text-c-dark-half" data-testid="save-status">
            <span
              className={clsx(
                "size-2 rounded-full",
                status === "saved" && "bg-c-accent-dark",
                status === "unsaved" && "bg-c-dark-half",
                status === "saving" && "bg-c-accent animate-pulse",
                status === "failed" && "bg-c-error",
              )}
            />
            {status === "saved" && "Saved"}
            {status === "unsaved" && "Unsaved changes"}
            {status === "saving" && "Saving…"}
            {status === "failed" && "Save failed, retrying"}
          </span>
          <Button variant="outline" theme="error" onClick={remove} className="h-9" data-testid="delete-drawing">
            Delete
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <Excalidraw
            excalidrawAPI={(a) => (api.current = a)}
            initialData={initialData}
            onChange={onChange}
            UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </Excalidraw>
        </div>
      </div>
    );
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).replace(/^data:.*?;base64,/, ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}
