import { Temporal } from "@js-temporal/polyfill";
import { isAbsolute, join } from "path";
import { z } from "zod/v4";
import packageJson from "../package.json";
import { TimeZone } from "./helpers/TimeZone";
import { LogLevel } from "./models/internal/LogLevel";
import { SupportToken } from "./support/SupportToken";
import { ExtractBetter } from "./types/ExtractBetter";

export namespace Env {
  const Schema = z.object({
    EXCALISELF_STAGE: z.enum(["dev", "e2e", "prod"]),
    EXCALISELF_TIMEZONE: z.string().refine((tz) => TimeZone.check(tz), {
      error: "invalid_timezone",
    }),

    EXCALISELF_ROOT: z.string(),
    EXCALISELF_LOGGING: z.enum(LogLevel),
    EXCALISELF_SUPPORT_TOKEN: z.string().optional(),
    EXCALISELF_VERIFICATION_KEY: z.string().transform((str) => str.replaceAll("\\n", "\n")),
  });

  type Defaultable = ExtractBetter<keyof z.input<typeof Schema>, "EXCALISELF_TIMEZONE" | "EXCALISELF_LOGGING">;
  const Defaults: Record<Defaultable, string> = {
    EXCALISELF_TIMEZONE: "UTC",
    EXCALISELF_LOGGING: "info",
  };

  export function initialize(timezone = Temporal.Now.timeZoneId() as "UTC", environment: Record<string, string | undefined> = Bun.env) {
    if (timezone !== "UTC") {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    const { provided, merged } = withDefaults(environment);
    return Schema.transform(({ EXCALISELF_ROOT, EXCALISELF_SUPPORT_TOKEN, EXCALISELF_VERIFICATION_KEY, ...env }) => ({
      ...env,
      EXCALISELF_ROOT: isAbsolute(EXCALISELF_ROOT) ? EXCALISELF_ROOT : join(process.cwd(), EXCALISELF_ROOT),
      EXCALISELF_SUPPORTER: Boolean(SupportToken.verify({ hexToken: EXCALISELF_SUPPORT_TOKEN, publicKey: EXCALISELF_VERIFICATION_KEY })),
    }))
      .transform((env) => ({
        ...env,
        EXCALISELF_COMMIT: packageJson.commit.slice(0, 7),
        EXCALISELF_VERSION: packageJson.version,
        EXCALISELF_HTPASSWD: join(env.EXCALISELF_ROOT, ".htpasswd"),
        EXCALISELF_DATABASE: join(env.EXCALISELF_ROOT, "data", "db.sqlite"),
        EXCALISELF_PROVIDED: provided,
      }))
      .parse(merged);
  }
  initialize.partiallyForLogger = (environment: Record<string, string | undefined> = Bun.env) => {
    const { merged } = withDefaults(environment);
    return Schema.partial()
      .required({
        EXCALISELF_TIMEZONE: true,
        EXCALISELF_LOGGING: true,
      })
      .parse(merged);
  };

  export type Private = ReturnType<typeof initialize>;
  export type Public = Readonly<Pick<Private, "EXCALISELF_STAGE" | "EXCALISELF_TIMEZONE" | "EXCALISELF_COMMIT" | "EXCALISELF_VERSION" | "EXCALISELF_SUPPORTER">>;
  export function onlyPublic(env: Private): Public {
    return {
      EXCALISELF_STAGE: env.EXCALISELF_STAGE,
      EXCALISELF_TIMEZONE: env.EXCALISELF_TIMEZONE,
      EXCALISELF_COMMIT: env.EXCALISELF_COMMIT,
      EXCALISELF_VERSION: env.EXCALISELF_VERSION,
      EXCALISELF_SUPPORTER: env.EXCALISELF_SUPPORTER,
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
