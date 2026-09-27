import { ComponentProps } from "react";

export function ChevronDown(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}
