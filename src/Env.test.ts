import { LogLevel } from "@/models/internal/LogLevel";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { Env } from "./Env";

describe("Env", () => {
  const REQUIRED = {
    EXCALIBEE_STAGE: "dev",
    EXCALIBEE_ROOT: "/opt/excalibee",
  };

  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  it("should fall back to a default for what is unset or empty, and remember what was provided", () => {
    // given
    const env = Env.initialize("UTC", { ...REQUIRED, EXCALIBEE_LOGGING: "debug", EXCALIBEE_TIMEZONE: "" });
    // then
    expect(env.EXCALIBEE_LOGGING).toEqual(LogLevel.debug);
    expect(env.EXCALIBEE_TIMEZONE).toEqual("UTC");
    expect(env.EXCALIBEE_PROVIDED).toEqual({ EXCALIBEE_LOGGING: "debug" });
  });

  it("should expose only the public keys", () => {
    // given
    const env = Env.initialize("UTC", REQUIRED);
    // then
    expect(Object.keys(Env.onlyPublic(env)).sort()).toEqual(["EXCALIBEE_COMMIT", "EXCALIBEE_STAGE", "EXCALIBEE_TIMEZONE", "EXCALIBEE_VERSION"]);
  });
});
