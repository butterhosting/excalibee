import clsx from "clsx";

/**
 * The bee from the Logo frame in uxui.sketch, cropped out of its 200-unit box (same crop as favicon.svg)
 */
export namespace Logo {
  type MarkProps = {
    className?: string;
  };
  export function Mark({ className }: MarkProps) {
    const ink = "var(--color-c-dark-full)";
    return (
      <svg viewBox="92 -4 108 100" className={className} aria-hidden>
        <ellipse cx="151" cy="69" rx="36" ry="25" fill="#5f5f68" />
        <ellipse cx="129" cy="21.5" rx="15" ry="15.5" fill="#ffffff" fillOpacity="0.92" stroke={ink} strokeWidth="4.8" transform="rotate(-28 129 21.5)" />
        <ellipse cx="154.5" cy="18.5" rx="14.5" ry="15.5" fill="#ffffff" fillOpacity="0.92" stroke={ink} strokeWidth="4.8" transform="rotate(-12 154.5 18.5)" />
        <ellipse cx="144" cy="62" rx="36" ry="25" fill="var(--color-c-accent)" stroke={ink} strokeWidth="6" />
        <circle cx="178" cy="62" r="15" fill={ink} />
        <path d="M0 14 C 2.5 4, 10 1, 14 0" transform="translate(181 32)" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M0 6 L14 0 L14 12 Z" transform="translate(96 56)" fill={ink} />
      </svg>
    );
  }

  export function Lockup({ className }: MarkProps) {
    return (
      <div className={clsx("flex flex-col items-center gap-1", className)}>
        <div className="flex items-center gap-2">
          <Mark className="h-9" />
          <span className="text-4xl font-extrabold tracking-tight">Excalibee</span>
        </div>
        <span className="pl-10">
          <span className="text-c-dark-half">by </span>
          <a
            href="https://www.butterhost.ing"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline decoration-c-accent decoration-2 underline-offset-[3px] hover:decoration-c-accent-dark"
          >
            Butterhost.ing
          </a>
        </span>
      </div>
    );
  }
}
