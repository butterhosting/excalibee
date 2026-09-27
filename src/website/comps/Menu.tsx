import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../images/Icon";

type Item = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};
type Props = {
  items: Item[];
  label: string;
};
export function Menu({ items, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={clsx("size-8 rounded-lg flex items-center justify-center text-c-dark-half cursor-pointer hover:bg-c-paper outline-c-accent-dark", open && "bg-c-paper")}
      >
        <Icon.Dots className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-10 w-44 bg-white border border-c-line rounded-xl shadow-lg p-1.5 flex flex-col">
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={clsx(
                "text-left text-sm h-8 px-2.5 rounded-lg cursor-pointer hover:bg-c-paper",
                item.danger ? "text-c-error border-t border-c-line mt-1 pt-0.5 rounded-t-none" : "text-c-dark-full",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
