import { Env } from "@/Env";
import { describe, expect, it } from "bun:test";
import { Sqlite } from "./sqlite";

describe("sqlite", () => {
  it("successfully applies all migrations", async () => {
    // given
    const env = { EXCALISELF_DATABASE: ":memory:" } as Env.Private;
    // when
    const sqlite = await Sqlite.initialize(env);
    // then (no errors)
    expect(sqlite).toBeDefined(); // no errors
  });
});
