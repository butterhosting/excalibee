import { ComponentProps } from "react";

export function Plus(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}
