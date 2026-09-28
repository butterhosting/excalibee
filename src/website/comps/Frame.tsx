import clsx from "clsx";
import { ReactNode } from "react";
import { useRegistry } from "../hooks/useRegistry";
import { Logo } from "./Logo";

type Props = {
  actions?: ReactNode;
  tools?: ReactNode;
  className?: string;
  children: ReactNode;
};
export function Frame({ actions, tools, className, children }: Props) {
  return (
    <>
      <Internal.Header actions={actions} tools={tools} />
      <main className={clsx("flex-1 w-full max-w-360 mx-auto px-10 py-8 flex flex-col", className)}>{children}</main>
      <Internal.Footer />
    </>
  );
}

namespace Internal {
  export function Header({ actions, tools }: Pick<Props, "actions" | "tools">) {
    return (
      <header className="bg-white border-b border-c-line">
        <div className="h-[72px] px-8 flex items-center gap-3 max-w-360 mx-auto">
          {actions}
          <span className="flex-1" />
          {tools}
        </div>
      </header>
    );
  }

  export function Footer() {
    const { EXCALIBEE_SUPPORTER } = useRegistry("env");
    return (
      <footer className="w-full max-w-360 mx-auto px-10">
        <div className="py-10 flex justify-center">
          <Logo.Lockup supporter={EXCALIBEE_SUPPORTER} />
        </div>
      </footer>
    );
  }
}
