import { ComponentProps } from "react";

export function Folder(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="-1.5 -1.5 29 25" fill="var(--color-c-accent)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...props}>
      <path d="M1 4a3 3 0 0 1 3-3h6l3 3h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3z" />
    </svg>
  );
}
