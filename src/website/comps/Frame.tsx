import clsx from "clsx";
import { ReactNode } from "react";
import { Link } from "react-router";
import { useRegistry } from "../hooks/useRegistry";
import { Route } from "../Route";
import { Logo } from "./Logo";

type Props = {
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};
export function Frame({ actions, className, children }: Props) {
  return (
    <>
      <Internal.Header actions={actions} />
      <main className={clsx("flex-1 w-full max-w-360 mx-auto px-10 py-8 flex flex-col", className)}>{children}</main>
      <Internal.Footer />
    </>
  );
}

namespace Internal {
  export function Header({ actions }: Pick<Props, "actions">) {
    return (
      <header className="bg-white border-b border-c-line">
        <div className="h-[72px] px-8 flex items-center gap-3 max-w-360 mx-auto">
          <Link to={Route.library()} className="rounded-lg outline-c-accent-dark" aria-label="Library">
            <Logo.Mark className="h-9" />
          </Link>
          <span className="flex-1" />
          {actions}
        </div>
      </header>
    );
  }

  export function Footer() {
    const { EXCALISELF_SUPPORTER } = useRegistry("env");
    return (
      <footer className="w-full max-w-360 mx-auto px-10">
        <div className="py-10 flex justify-center">
          <Logo.Lockup supporter={EXCALISELF_SUPPORTER} />
        </div>
      </footer>
    );
  }
}
