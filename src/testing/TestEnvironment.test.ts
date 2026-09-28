import { Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Logger } from "@/Logger";
import { LogLevel } from "@/models/internal/LogLevel";
import { DrawingRepository } from "@/repositories/DrawingRepository";
import { FolderRepository } from "@/repositories/FolderRepository";
import { OmitBetter } from "@/types/OmitBetter";
import { jest, mock, Mock } from "bun:test";
import { mkdir, rm } from "fs/promises";
import { dirname, join } from "path";

export namespace TestEnvironment {
  type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
  } & {
    cast: () => T;
  };

  export interface Context {
    env: Env.Private;
    sqlite: Sqlite;
    patchEnvironmentVariables(environment: Record<string, string>): void;
    folderRepository: FolderRepository;
    folderRepositoryMock: Mocked<FolderRepository>;
    drawingRepository: DrawingRepository;
    drawingRepositoryMock: Mocked<DrawingRepository>;
  }

  const cleanupTasks: Array<() => unknown | Promise<unknown>> = [];
  const originalEnv = { ...Bun.env };

  export async function initialize(): Promise<Context> {
    // Cleanup between unit tests
    mock.restore();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    Object.assign(Bun.env, originalEnv);
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop()!; // in reverse order = important!
      await task();
    }

    // Ensure we're running from the project root
    const cwd = await (async function ensureValidCwd(): Promise<string> {
      const cwd = process.cwd();
      const packageJsonPath = join(cwd, "package.json");
      const packageJsonFile = Bun.file(packageJsonPath);
      if (!(await packageJsonFile.exists())) {
        throw new Error(`Invalid working directory, package.json not found: ${packageJsonPath}`);
      }
      const { name } = await packageJsonFile.json();
      if (name !== "excalibee") {
        throw new Error(`Invalid working directory, invalid project name in package.json: ${name}`);
      }
      return cwd;
    })();

    // Setup env
    // We'd have to make this root unique (with a random part) to support parallel unit tests,
    // but Bun is so fast it's not needed
    const unitTestRoot = join(cwd, "opt", "unit-test");
    const env = Env.initialize("UTC", {
      EXCALIBEE_STAGE: "dev",
      EXCALIBEE_TIMEZONE: "UTC",
      EXCALIBEE_ROOT: join(unitTestRoot, "excalibee"),
      EXCALIBEE_LOGGING: LogLevel.warn,
      EXCALIBEE_VERIFICATION_KEY:
        "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAalpLQu9Fkn/R3WylORAad6UB0XAOowFIjF2/FwAyjpc=\n-----END PUBLIC KEY-----",
    });
    const patchEnvironmentVariables = (environment: Record<string, string>) => {
      Object.assign(Bun.env, environment);
    };

    // Initialize the logger
    Logger.initialize(env);

    // Setup filesystem
    await mkdir(dirname(env.EXCALIBEE_DATABASE), { recursive: true });
    await rm(env.EXCALIBEE_DATABASE, { force: true });

    // Setup SQLite
    const sqlite = await Sqlite.initialize(env);
    cleanupTasks.push(() => sqlite.close());

    // Mock registration
    function registerMockObject<T>(mockObject: OmitBetter<Mocked<T>, "cast">): Mocked<T> {
      const extra = { cast: () => mockObject as T } as Pick<Mocked<T>, "cast">;
      Object.assign(mockObject, extra);
      return mockObject as Mocked<T>;
    }

    // Dependencies
    const folderRepository = new FolderRepository(sqlite);
    const folderRepositoryMock = registerMockObject<FolderRepository>({
      list: mock(),
      find: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    });
    const drawingRepository = new DrawingRepository(sqlite);
    const drawingRepositoryMock = registerMockObject<DrawingRepository>({
      list: mock(),
      find: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      findContent: mock(),
      updateContent: mock(),
    });

    return {
      env,
      sqlite,
      patchEnvironmentVariables,
      folderRepository,
      folderRepositoryMock,
      drawingRepository,
      drawingRepositoryMock,
    };
  }
}
