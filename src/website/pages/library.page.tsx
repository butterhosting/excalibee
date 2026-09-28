import { Drawing } from "@/models/Drawing";
import { Folder } from "@/models/Folder";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useYesQuery } from "react-yesquery";
import { DialogClient } from "../clients/DialogClient";
import { DrawingClient } from "../clients/DrawingClient";
import { FolderClient } from "../clients/FolderClient";
import { Button } from "../comps/Button";
import { Frame } from "../comps/Frame";
import { Menu } from "../comps/Menu";
import { ProblemText } from "../helpers/ProblemText";
import { RelativeTime } from "../helpers/RelativeTime";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { Icon } from "../images/Icon";
import { Route } from "../Route";

type Sort = "recent" | "name";

export function libraryPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const folderClient = useRegistry(FolderClient);
  const drawingClient = useRegistry(DrawingClient);
  const dialogClient = useRegistry(DialogClient);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [dragging, setDragging] = useState<Internal.Dragged>();
  const [notice, setNotice] = useState<string>();

  const folders = useYesQuery({ queryFn: () => folderClient.list() });
  const drawings = useYesQuery({ queryFn: () => drawingClient.list() });
  const allFolders = folders.data ?? [];
  const allDrawings = drawings.data ?? [];

  const current = folderId ? allFolders.find((f) => f.id === folderId) : undefined;
  useDocumentTitle(`${current ? current.name : "Library"} | Excalibee`);

  const crumbs = useMemo(() => {
    const chain: Folder[] = [];
    let cursor = current?.parentId ? allFolders.find((f) => f.id === current.parentId) : undefined;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? allFolders.find((f) => f.id === cursor!.parentId) : undefined;
    }
    return chain;
  }, [current, allFolders]);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;
  const byRecency = (a: Drawing | Folder, b: Drawing | Folder) => (b.updated ?? b.created).epochMilliseconds - (a.updated ?? a.created).epochMilliseconds;
  const byName = (a: Drawing | Folder, b: Drawing | Folder) => a.name.localeCompare(b.name);
  const order = sort === "recent" ? byRecency : byName;

  const subfolders = allFolders.filter((f) => f.parentId === folderId && (!searching || f.name.toLowerCase().includes(query))).toSorted(order);
  // a search looks through every folder, and through the text inside the drawings
  const shownDrawings = allDrawings
    .filter((d) => (searching ? d.name.toLowerCase().includes(query) || d.searchText.toLowerCase().includes(query) : d.folderId === folderId))
    .toSorted(order);

  const pathOf = (drawing: Drawing): string => {
    const names: string[] = [];
    let cursor = drawing.folderId ? allFolders.find((f) => f.id === drawing.folderId) : undefined;
    while (cursor) {
      names.unshift(cursor.name);
      cursor = cursor.parentId ? allFolders.find((f) => f.id === cursor!.parentId) : undefined;
    }
    return names.join(" › ");
  };

  const subtreeOf = (folderId: string) => {
    const ids = new Set([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      allFolders.forEach((f) => {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          grew = true;
        }
      });
    }
    return ids;
  };
  const countInside = (folder: Folder) => {
    const ids = subtreeOf(folder.id);
    return { folders: ids.size - 1, drawings: allDrawings.filter((d) => d.folderId && ids.has(d.folderId)).length };
  };
  // the heading names a node, so the line under it counts that node's whole subtree, like its card would
  const inside = current ? countInside(current).drawings : allDrawings.length;

  // native drag and drop: cards are dragged onto folder cards or breadcrumb entries (`undefined` = the top level)
  const canDrop = (target: string | undefined) => {
    if (!dragging) return false;
    if (dragging.kind === "drawing") return allDrawings.find((d) => d.id === dragging.id)?.folderId !== target;
    const folder = allFolders.find((f) => f.id === dragging.id);
    return Boolean(folder) && folder!.parentId !== target && !(target && subtreeOf(dragging.id).has(target));
  };
  const drop = async (target: string | undefined) => {
    const dragged = dragging;
    setDragging(undefined);
    if (!dragged || !canDrop(target)) return;
    try {
      if (dragged.kind === "drawing") {
        await drawingClient.update(dragged.id, { folderId: target ?? null });
        drawings.reload();
      } else {
        await folderClient.update(dragged.id, { parentId: target ?? null });
        folders.reload();
      }
    } catch (e) {
      setNotice(ProblemText.of(e));
      setTimeout(() => setNotice(undefined), 5000);
    }
  };
  const dropZone = (target: string | undefined): Internal.DropZone => ({ active: canDrop(target), drop: () => drop(target) });

  async function newFolder() {
    if ((await dialogClient.folderCreate(folderId)) !== "cancel") folders.reload();
  }
  async function newDrawing() {
    const result = await dialogClient.drawingCreate(folderId);
    if (result !== "cancel") navigate(Route.drawing(result.id));
  }
  async function folderAction(action: Promise<"cancel" | Folder>) {
    if ((await action) !== "cancel") folders.reload();
  }
  async function drawingAction(action: Promise<"cancel" | Drawing>) {
    if ((await action) !== "cancel") drawings.reload();
  }

  const actions = (
    <>
      <Button onClick={newDrawing} data-testid="new-drawing">
        <Icon.Plus className="size-4" />
        New drawing
      </Button>
      <Button variant="outline" onClick={newFolder} data-testid="new-folder">
        <Icon.Folder className="h-4 text-c-dark-full" />
        New folder
      </Button>
    </>
  );
  const tools = (
    <>
      <label className="relative">
        <Icon.Search className="size-4 text-c-dark-half absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drawings…"
          data-testid="search"
          className="h-10 w-80 pl-10 pr-3 rounded-[10px] bg-white border border-c-line text-sm focus:outline-none focus:border-c-accent-dark"
        />
      </label>
      <label className="relative">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-10 pl-3.5 pr-9 rounded-[10px] bg-white border border-c-line text-sm appearance-none cursor-pointer focus:outline-none focus:border-c-accent-dark"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
        </select>
        <Icon.ChevronDown className="size-4 text-c-dark-half absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </label>
    </>
  );

  if (folderId && folders.data && !current) {
    return (
      <Frame actions={actions} tools={tools}>
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <span className="text-lg font-semibold">This folder does not exist</span>
          <Link to={Route.library()} className="text-c-accent-dark font-semibold hover:underline">
            Back to the library
          </Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame actions={actions} tools={tools}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold tracking-tight leading-tight flex items-center gap-2.5">
          {current && (
            <nav className="contents" data-testid="breadcrumb">
              <Internal.Crumb to={Route.library()} zone={dropZone(undefined)}>
                Library
              </Internal.Crumb>
              <span className="text-c-dark-half/50 font-medium">/</span>
              {crumbs.map((crumb) => (
                <span key={crumb.id} className="contents">
                  <Internal.Crumb to={Route.library(crumb.id)} zone={dropZone(crumb.id)}>
                    {crumb.name}
                  </Internal.Crumb>
                  <span className="text-c-dark-half/50 font-medium">/</span>
                </span>
              ))}
            </nav>
          )}
          {current && <Icon.Folder className="h-6 text-c-dark-full shrink-0" />}
          <span data-testid="library-title">{current ? current.name : "Library"}</span>
        </h1>
        <span className="text-sm text-c-dark-half" data-testid="library-count">
          {searching ? `${shownDrawings.length} ${shownDrawings.length === 1 ? "drawing" : "drawings"} match, across all folders` : Internal.countLabel(inside)}
        </span>
      </div>

      {notice && (
        <p role="alert" className="mt-6 px-4 py-3 rounded-xl bg-white border border-c-error text-sm text-c-error" data-testid="notice">
          {notice}
        </p>
      )}

      {subfolders.length > 0 && (
        <section className="mt-8">
          <Internal.SectionLabel>Folders</Internal.SectionLabel>
          <div className="grid grid-cols-4 xl:grid-cols-3 md:grid-cols-2 gap-6">
            {subfolders.map((folder) => (
              <Internal.FolderCard
                key={folder.id}
                folder={folder}
                contents={countInside(folder)}
                dragged={dragging?.id === folder.id}
                onDragStart={() => setDragging({ kind: "folder", id: folder.id })}
                onDragEnd={() => setDragging(undefined)}
                zone={dropZone(folder.id)}
                onRename={() => folderAction(dialogClient.folderRename(folder))}
                onMove={() => folderAction(dialogClient.folderMove(folder, allFolders))}
                onDelete={() => folderAction(dialogClient.folderDelete(folder, countInside(folder)))}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <Internal.SectionLabel>{searching ? "Results" : "Drawings"}</Internal.SectionLabel>
        {shownDrawings.length > 0 ? (
          <div className="grid grid-cols-4 xl:grid-cols-3 md:grid-cols-2 gap-6">
            {shownDrawings.map((drawing) => (
              <Internal.DrawingCard
                key={drawing.id}
                drawing={drawing}
                thumbnailUrl={drawingClient.thumbnailUrl(drawing)}
                path={searching ? pathOf(drawing) : undefined}
                dragged={dragging?.id === drawing.id}
                onDragStart={() => setDragging({ kind: "drawing", id: drawing.id })}
                onDragEnd={() => setDragging(undefined)}
                onRename={() => drawingAction(dialogClient.drawingRename(drawing))}
                onMove={() => drawingAction(dialogClient.drawingMove(drawing, allFolders))}
                onDelete={() => drawingAction(dialogClient.drawingDelete(drawing))}
              />
            ))}
          </div>
        ) : (
          drawings.data && (
            <div className="border border-dashed border-c-dark-half/50 rounded-2xl py-16 text-center flex flex-col items-center gap-2" data-testid="empty">
              <span className="font-semibold">{searching ? "Nothing matches" : "No drawings here yet"}</span>
              <span className="text-sm text-c-dark-half">{searching ? "Names and the text inside drawings are searched." : "Start one with the button at the top."}</span>
            </div>
          )
        )}
      </section>
    </Frame>
  );
}

namespace Internal {
  export type Dragged = { kind: "drawing" | "folder"; id: string };
  export type DropZone = { active: boolean; drop: () => void };

  type Draggable = {
    dragged: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
  };

  /**
   * The browser only allows a drop where dragover was prevented, so the zone's `active` decides both the highlight
   * and whether the drop lands at all
   */
  function useDropZone(zone: DropZone) {
    const [over, setOver] = useState(false);
    return {
      over: over && zone.active,
      handlers: {
        onDragOver: (e: React.DragEvent) => {
          if (!zone.active) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setOver(false);
          zone.drop();
        },
      },
    };
  }

  function dragHandlers({ onDragStart, onDragEnd }: Draggable) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      },
      onDragEnd,
    };
  }

  export function countLabel(drawings: number) {
    return drawings === 0 ? "No drawings yet" : `${drawings} ${drawings === 1 ? "drawing" : "drawings"}`;
  }

  export function SectionLabel({ children }: { children: React.ReactNode }) {
    return <h2 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-c-dark-half mb-3">{children}</h2>;
  }

  export function Crumb({ to, zone, children }: { to: string; zone: DropZone; children: React.ReactNode }) {
    const { over, handlers } = useDropZone(zone);
    return (
      <Link
        to={to}
        {...handlers}
        className={clsx(
          "px-1.5 -mx-1.5 rounded-lg font-semibold text-c-dark-half hover:text-c-dark-full",
          over && "bg-c-tint text-c-dark-full ring-2 ring-c-accent-dark",
        )}
      >
        {children}
      </Link>
    );
  }

  type FolderCardProps = Draggable & {
    folder: Folder;
    contents: { folders: number; drawings: number };
    zone: DropZone;
    onRename: () => void;
    onMove: () => void;
    onDelete: () => void;
  };
  export function FolderCard({ folder, contents, zone, onRename, onMove, onDelete, ...draggable }: FolderCardProps) {
    const navigate = useNavigate();
    const { over, handlers } = useDropZone(zone);
    const meta = contents.drawings === 0 ? "Empty" : `${contents.drawings} ${contents.drawings === 1 ? "drawing" : "drawings"}`;
    return (
      <div
        data-testid="folder-card"
        {...dragHandlers(draggable)}
        {...handlers}
        className={clsx(
          "group bg-white border border-c-line rounded-2xl h-16 pl-4 pr-3 flex items-center gap-3 hover:border-c-accent-dark hover:shadow-md transition-all cursor-pointer",
          draggable.dragged && "opacity-40",
          over && "border-c-accent-dark bg-c-tint ring-2 ring-c-accent-dark",
        )}
        onClick={() => navigate(Route.library(folder.id))}
      >
        <Icon.Folder className="h-5 text-c-dark-full shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col">
          <Link to={Route.library(folder.id)} className="font-semibold truncate outline-none" onClick={(e) => e.stopPropagation()}>
            {folder.name}
          </Link>
          <span className="text-xs text-c-dark-half">{meta}</span>
        </div>
        <Menu
          label={`Actions for ${folder.name}`}
          items={[
            { label: "Open", onSelect: () => navigate(Route.library(folder.id)) },
            { label: "Rename", onSelect: onRename },
            { label: "Move to…", onSelect: onMove },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    );
  }

  type DrawingCardProps = Draggable & {
    drawing: Drawing;
    thumbnailUrl: string;
    path?: string;
    onRename: () => void;
    onMove: () => void;
    onDelete: () => void;
  };
  export function DrawingCard({ drawing, thumbnailUrl, path, onRename, onMove, onDelete, ...draggable }: DrawingCardProps) {
    const navigate = useNavigate();
    const [thumbnailMissing, setThumbnailMissing] = useState(false);
    return (
      <div
        data-testid="drawing-card"
        {...dragHandlers(draggable)}
        className={clsx(
          "group bg-white border border-c-line rounded-2xl flex flex-col hover:border-c-accent-dark hover:shadow-md transition-all cursor-pointer",
          draggable.dragged && "opacity-40",
        )}
        onClick={() => navigate(Route.drawing(drawing.id))}
      >
        <div className="h-40 bg-white border-b border-c-line rounded-t-2xl flex items-center justify-center overflow-hidden">
          {thumbnailMissing ? (
            <span className="text-xs font-semibold tracking-wider uppercase text-c-line">Empty canvas</span>
          ) : (
            <img
              src={thumbnailUrl}
              alt=""
              onError={() => setThumbnailMissing(true)}
              className={clsx("max-h-full max-w-full object-contain p-3")}
            />
          )}
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 flex flex-col">
            <Link to={Route.drawing(drawing.id)} className="font-semibold truncate outline-none" onClick={(e) => e.stopPropagation()}>
              {drawing.name}
            </Link>
            <span className="text-xs text-c-dark-half truncate">
              {path ? `${path} · ` : ""}
              Edited {RelativeTime.format(drawing.updated ?? drawing.created)}
            </span>
          </div>
          <Menu
            label={`Actions for ${drawing.name}`}
            items={[
              { label: "Open", onSelect: () => navigate(Route.drawing(drawing.id)) },
              { label: "Rename", onSelect: onRename },
              { label: "Move to…", onSelect: onMove },
              { label: "Delete", onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
    );
  }
}
