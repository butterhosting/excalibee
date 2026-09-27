import clsx from "clsx";

/**
 * The mark from the Logo frame in uxui.sketch
 */
export namespace Logo {
  const TILES: [x: number, y: number][] = [
    [6, 74],
    [75, 54],
    [144, 74],
  ];
  const STEP = 7;
  const HEART = "M25 44 C 10 33, 0 25, 0 13 C 0 5, 6 0, 13 0 C 18 0, 22 3, 25 7 C 28 3, 32 0, 37 0 C 44 0, 50 5, 50 13 C 50 25, 40 33, 25 44 Z";

  type MarkProps = {
    supporter?: boolean;
    className?: string;
  };
  export function Mark({ supporter, className }: MarkProps) {
    return (
      <svg viewBox="0 46 200 130" className={className} aria-hidden>
        <path d="M20 156 C 60 170, 140 130, 184 148" fill="none" stroke="var(--color-c-accent)" strokeWidth="18" strokeLinecap="round" />
        {TILES.map(([x, y], i) =>
          supporter && i === 1 ? (
            <path key={i} d={HEART} transform={`translate(${x + STEP} ${y + STEP})`} fill="#5f5f68" />
          ) : (
            <rect key={i} x={x + STEP} y={y + STEP} width="50" height="44" rx="10" fill="#5f5f68" />
          ),
        )}
        {TILES.map(([x, y], i) =>
          supporter && i === 1 ? (
            <path
              key={i}
              d={HEART}
              transform={`translate(${x} ${y})`}
              fill="var(--color-c-error)"
              stroke="var(--color-c-dark-full)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          ) : (
            <rect key={i} x={x} y={y} width="50" height="44" rx="10" fill="var(--color-c-accent)" stroke="var(--color-c-dark-full)" strokeWidth="6" />
          ),
        )}
        <path
          d="M56 96 C 66 96, 66 76, 75 76 M125 76 C 134 76, 134 96, 144 96"
          fill="none"
          stroke="var(--color-c-dark-full)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  export function Lockup({ supporter, className }: MarkProps) {
    return (
      <div className={clsx("flex items-center gap-3", className)}>
        <Mark supporter={supporter} className="h-11" />
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight leading-none text-[24px]">Excaliself</span>
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
