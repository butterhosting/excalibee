import { ComponentProps } from "react";

export function Pencil(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 16l1-4 9-9 3 3-9 9z" />
    </svg>
  );
}
