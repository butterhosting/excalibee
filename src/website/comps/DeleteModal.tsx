import { ReactNode, useState } from "react";
import { ProblemText } from "../helpers/ProblemText";
import { Button } from "./Button";
import { Modal } from "./Modal";

type Props<T> = {
  title: string;
  body: ReactNode;
  actionLabel: string;
  perform: () => Promise<T>;
  close: () => void;
  done: (result: T) => void;
};
export function DeleteModal<T>({ title, body, actionLabel, perform, close, done }: Props<T>) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    try {
      setError(undefined);
      setBusy(true);
      done(await perform());
    } catch (e) {
      setError(ProblemText.of(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen issueCloseRequestWhenClickingBackdrop issueCloseRequestWhenPressingEscape onCloseRequest={() => !busy && close()} className="p-7">
      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-c-dark-half leading-relaxed">{body}</p>
        {error && <p className="text-sm text-c-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" theme="neutral" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button theme="error" onClick={handleDelete} loading={busy} data-testid="confirm-delete">
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
