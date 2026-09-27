import clsx from "clsx";
import { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  theme?: Button.Theme;
  variant?: Button.Variant;
  loading?: boolean;
};
export function Button({ theme = "accent", variant = "filled", loading, disabled, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] text-sm font-semibold cursor-pointer transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed outline-c-accent-dark",
        variant === "filled" && theme === "accent" && "bg-c-accent text-c-dark-full hover:bg-c-accent-dark",
        variant === "filled" && theme === "error" && "bg-c-error text-white hover:bg-c-error/90",
        variant === "filled" && theme === "neutral" && "bg-c-dark-full text-white hover:bg-c-dark-half",
        variant === "outline" && theme === "accent" && "bg-white border border-c-line text-c-dark-full hover:bg-c-paper",
        variant === "outline" && theme === "error" && "bg-white border border-c-line text-c-error hover:bg-c-paper",
        variant === "outline" && theme === "neutral" && "bg-white border border-c-line text-c-dark-half hover:bg-c-paper",
        variant === "ghost" && theme === "accent" && "text-c-accent-dark hover:bg-c-tint",
        variant === "ghost" && theme === "error" && "text-c-error hover:bg-c-error/5",
        variant === "ghost" && theme === "neutral" && "text-c-dark-half hover:text-c-dark-full hover:bg-c-paper",
        className,
      )}
    >
      {loading && <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}
export namespace Button {
  export type Theme = "accent" | "neutral" | "error";
  export type Variant = "filled" | "outline" | "ghost";
}
