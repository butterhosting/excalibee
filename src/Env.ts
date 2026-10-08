import { Temporal } from "@js-temporal/polyfill";
import { isAbsolute, join } from "path";
import { z } from "zod/v4";
import packageJson from "../package.json";
import { TimeZone } from "./helpers/TimeZone";
import { LogLevel } from "./models/internal/LogLevel";
import { ExtractBetter } from "./types/ExtractBetter";

export namespace Env {
  const Schema = z.object({
    EXCALIBEE_STAGE: z.enum(["dev", "e2e", "prod"]),
    EXCALIBEE_TIMEZONE: z.string().refine((tz) => TimeZone.check(tz), {
      error: "invalid_timezone",
    }),

    EXCALIBEE_ROOT: z.string(),
    EXCALIBEE_LOGGING: z.enum(LogLevel),
  });

  type Defaultable = ExtractBetter<keyof z.input<typeof Schema>, "EXCALIBEE_TIMEZONE" | "EXCALIBEE_LOGGING">;
  const Defaults: Record<Defaultable, string> = {
    EXCALIBEE_TIMEZONE: "UTC",
    EXCALIBEE_LOGGING: "info",
  };

  export function initialize(timezone = Temporal.Now.timeZoneId() as "UTC", environment: Record<string, string | undefined> = Bun.env) {
    if (timezone !== "UTC") {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    const { provided, merged } = withDefaults(environment);
    return Schema.transform(({ EXCALIBEE_ROOT, ...env }) => ({
      ...env,
      EXCALIBEE_ROOT: isAbsolute(EXCALIBEE_ROOT) ? EXCALIBEE_ROOT : join(process.cwd(), EXCALIBEE_ROOT),
    }))
      .transform((env) => ({
        ...env,
        EXCALIBEE_COMMIT: packageJson.commit.slice(0, 7),
        EXCALIBEE_VERSION: packageJson.version,
        EXCALIBEE_HTPASSWD: join(env.EXCALIBEE_ROOT, ".htpasswd"),
        EXCALIBEE_DATABASE: join(env.EXCALIBEE_ROOT, "data", "db.sqlite"),
        EXCALIBEE_PROVIDED: provided,
      }))
      .parse(merged);
  }
  initialize.partiallyForLogger = (environment: Record<string, string | undefined> = Bun.env) => {
    const { merged } = withDefaults(environment);
    return Schema.partial()
      .required({
        EXCALIBEE_TIMEZONE: true,
        EXCALIBEE_LOGGING: true,
      })
      .parse(merged);
  };

  export type Private = ReturnType<typeof initialize>;
  export type Public = Readonly<Pick<Private, "EXCALIBEE_STAGE" | "EXCALIBEE_TIMEZONE" | "EXCALIBEE_COMMIT" | "EXCALIBEE_VERSION">>;
  export function onlyPublic(env: Private): Public {
    return {
      EXCALIBEE_STAGE: env.EXCALIBEE_STAGE,
      EXCALIBEE_TIMEZONE: env.EXCALIBEE_TIMEZONE,
      EXCALIBEE_COMMIT: env.EXCALIBEE_COMMIT,
      EXCALIBEE_VERSION: env.EXCALIBEE_VERSION,
    };
  }

  // v-- helper functions --v

  // an env file expands an unset variable to nothing, so empty counts as unset
  function withDefaults(environment: Record<string, string | undefined>) {
    const provided: Partial<Record<Defaultable, string>> = {};
    const merged = { ...environment };
    for (const key of Object.keys(Defaults) as Defaultable[]) {
      const value = environment[key];
      if (value) {
        provided[key] = value;
      } else {
        merged[key] = Defaults[key];
      }
    }
    return { provided, merged };
  }
}
