import { LogLevel } from "@/models/internal/LogLevel";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { Env } from "./Env";

describe("Env", () => {
  const REQUIRED = {
    EXCALISELF_STAGE: "dev",
    EXCALISELF_ROOT: "/opt/excaliself",
    EXCALISELF_VERIFICATION_KEY: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAalpLQu9Fkn/R3WylORAad6UB0XAOowFIjF2/FwAyjpc=\n-----END PUBLIC KEY-----",
  };

  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  it("should fall back to a default for what is unset or empty, and remember what was provided", () => {
    // given
    const env = Env.initialize("UTC", { ...REQUIRED, EXCALISELF_LOGGING: "debug", EXCALISELF_TIMEZONE: "" });
    // then
    expect(env.EXCALISELF_LOGGING).toEqual(LogLevel.debug);
    expect(env.EXCALISELF_TIMEZONE).toEqual("UTC");
    expect(env.EXCALISELF_PROVIDED).toEqual({ EXCALISELF_LOGGING: "debug" });
  });

  it("should expose only the public keys", () => {
    // given
    const env = Env.initialize("UTC", REQUIRED);
    // then
    expect(Object.keys(Env.onlyPublic(env)).sort()).toEqual(["EXCALISELF_COMMIT", "EXCALISELF_STAGE", "EXCALISELF_SUPPORTER", "EXCALISELF_TIMEZONE", "EXCALISELF_VERSION"]);
  });
});
