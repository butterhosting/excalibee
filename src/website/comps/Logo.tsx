import clsx from "clsx";

/**
 * The bee from the Logo frame in uxui.sketch, in its 200-unit box
 */
export namespace Logo {
  const HEART = "M25 44 C 10 33, 0 25, 0 13 C 0 5, 6 0, 13 0 C 18 0, 22 3, 25 7 C 28 3, 32 0, 37 0 C 44 0, 50 5, 50 13 C 50 25, 40 33, 25 44 Z";

  type MarkProps = {
    supporter?: boolean;
    className?: string;
  };
  export function Mark({ supporter, className }: MarkProps) {
    const ink = "var(--color-c-dark-full)";
    return (
      <svg viewBox="0 0 200 172" className={className} aria-hidden>
        <path
          d="M14 150 C 30 90, 80 90, 92 130 S 60 178, 96 160 S 130 96, 150 96"
          fill="none"
          stroke={ink}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="12 12"
        />
        <ellipse cx="151" cy="69" rx="36" ry="25" fill="#5f5f68" />
        <ellipse cx="129" cy="21.5" rx="15" ry="15.5" fill="#ffffff" fillOpacity="0.92" stroke={ink} strokeWidth="4.8" transform="rotate(-28 129 21.5)" />
        <ellipse cx="154.5" cy="18.5" rx="14.5" ry="15.5" fill="#ffffff" fillOpacity="0.92" stroke={ink} strokeWidth="4.8" transform="rotate(-12 154.5 18.5)" />
        <ellipse cx="144" cy="62" rx="36" ry="25" fill="var(--color-c-accent)" stroke={ink} strokeWidth="6" />
        {supporter && <path d={HEART} transform="translate(31 39) scale(1.04)" fill="var(--color-c-error)" stroke={ink} strokeWidth="5" strokeLinejoin="round" />}
        <circle cx="178" cy="62" r="15" fill={ink} />
        <path d="M0 14 C 2.5 4, 10 1, 14 0" transform="translate(181 32)" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M0 6 L14 0 L14 12 Z" transform="translate(96 56)" fill={ink} />
      </svg>
    );
  }

  export function Lockup({ supporter, className }: MarkProps) {
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        <Mark supporter={supporter} className="h-11" />
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight leading-none text-[24px]">Excalibee</span>
          <span className="text-[13px] leading-tight mt-1">
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
      </div>
    );
  }
}
