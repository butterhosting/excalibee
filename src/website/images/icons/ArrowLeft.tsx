import { ComponentProps } from "react";

export function ArrowLeft(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 4 4 10l6 6M4 10h12" />
    </svg>
  );
}
