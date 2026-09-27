import { Temporal } from "@js-temporal/polyfill";

export namespace RelativeTime {
  const UNITS: [name: string, ms: number][] = [
    ["year", 365 * 24 * 3600_000],
    ["month", 30 * 24 * 3600_000],
    ["week", 7 * 24 * 3600_000],
    ["day", 24 * 3600_000],
    ["hour", 3600_000],
    ["minute", 60_000],
  ];

  export function format(instant: Temporal.Instant, now = Temporal.Now.instant()): string {
    const elapsed = now.epochMilliseconds - instant.epochMilliseconds;
    for (const [name, ms] of UNITS) {
      const count = Math.floor(elapsed / ms);
      if (count >= 1) {
        if (name === "day" && count === 1) return "yesterday";
        return count === 1 ? `a${name === "hour" ? "n" : ""} ${name} ago` : `${count} ${name}s ago`;
      }
    }
    return "just now";
  }
}
