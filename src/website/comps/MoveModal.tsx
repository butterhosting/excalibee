import { Folder } from "@/models/Folder";
import clsx from "clsx";
import { useState } from "react";
import { Icon } from "../images/Icon";
import { ProblemText } from "../helpers/ProblemText";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { Modal } from "./Modal";

type Props<T> = {
  title: string;
  folders: Folder[];
  /**
   * The folder the item is in right now (`undefined` = top level), preselected
   */
  currentParentId?: string;
  /**
   * Folders that cannot be picked: a folder can't move into itself or into one of its own descendants
   */
  disabled?: (folderId: string) => boolean;
  perform: (parentId: string | null) => Promise<T>;
  close: () => void;
  done: (result: T) => void;
};
export function MoveModal<T>({ title, folders, currentParentId, disabled = () => false, perform, close, done }: Props<T>) {
  const [selected, setSelected] = useState<string | null>(currentParentId ?? null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleMove() {
    try {
      setError(undefined);
      setBusy(true);
      done(await perform(selected));
    } catch (e) {
      setError(ProblemText.of(e));
    } finally {
      setBusy(false);
    }
  }

  // depth-first, so that the list reads as an indented tree
  const rows: { folder: Folder; depth: number }[] = [];
  const visit = (parentId: string | undefined, depth: number) => {
    folders
      .filter((f) => f.parentId === parentId)
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .forEach((folder) => {
        rows.push({ folder, depth });
        visit(folder.id, depth + 1);
      });
  };
  visit(undefined, 1);

  const row = (key: string, depth: number, label: string, value: string | null, isDisabled: boolean, icon: React.ReactNode) => (
    <button
      key={key}
      type="button"
      disabled={isDisabled}
      onClick={() => setSelected(value)}
      data-testid="move-target"
      className={clsx(
        "w-full flex items-center gap-2.5 h-9 rounded-lg text-sm text-left cursor-pointer outline-c-accent-dark",
        selected === value ? "bg-c-tint font-semibold" : "hover:bg-white",
        isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
      )}
      style={{ paddingLeft: 8 + depth * 22 }}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {selected === value && <span className="text-c-accent-dark pr-3">✓</span>}
    </button>
  );

  return (
    <Modal isOpen issueCloseRequestWhenClickingBackdrop issueCloseRequestWhenPressingEscape onCloseRequest={() => !busy && close()} className="p-7">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-c-dark-half mt-1">Pick a folder. Folders can live inside folders.</p>
        </div>
        <div className="bg-c-paper border border-c-line rounded-xl p-1 max-h-80 overflow-auto">
          {row("root", 0, "Library", null, false, <Logo.Mark className="h-5" />)}
          {rows.map(({ folder, depth }) =>
            row(folder.id, depth, folder.name, folder.id, disabled(folder.id), <Icon.Folder className="h-4 text-c-dark-full" />),
          )}
        </div>
        {error && <p className="text-sm text-c-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" theme="neutral" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleMove} loading={busy} disabled={selected === (currentParentId ?? null)} data-testid="confirm-move">
            Move here
          </Button>
        </div>
      </div>
    </Modal>
  );
}
