import { useState } from "react";
import { ProblemText } from "../helpers/ProblemText";
import { Button } from "./Button";
import { Modal } from "./Modal";

type Props<T> = {
  title: string;
  label: string;
  placeholder: string;
  initial?: string;
  submitLabel: string;
  submit: (name: string) => Promise<T>;
  close: () => void;
  done: (result: T) => void;
};
/**
 * Creating and renaming folders and drawings all come down to asking for one name
 */
export function NameModal<T>({ title, label, placeholder, initial, submitLabel, submit, close, done }: Props<T>) {
  const [name, setName] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    try {
      setError(undefined);
      setBusy(true);
      done(await submit(name.trim()));
    } catch (e) {
      setError(ProblemText.of(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen issueCloseRequestWhenClickingBackdrop issueCloseRequestWhenPressingEscape onCloseRequest={() => !busy && close()} className="p-7">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-c-dark-half">{label}</span>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={placeholder}
            data-testid="name-input"
            className="h-10 px-3 rounded-[10px] border border-c-line text-sm focus:outline-none focus:border-c-accent-dark"
          />
        </label>
        {error && <p className="text-sm text-c-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" theme="neutral" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()} loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
