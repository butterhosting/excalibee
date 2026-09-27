import { Class } from "@/types/Class";
import { Sqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { Initialize } from "./Initialize";
import { BasicAuthMiddleware } from "./middleware/basicauth/BasicAuthMiddleware";
import { LoggingMiddleware } from "./middleware/logging/LoggingMiddleware";
import { Middleware } from "./middleware/Middleware";
import { DrawingRepository } from "./repositories/DrawingRepository";
import { FolderRepository } from "./repositories/FolderRepository";
import { Server } from "./Server";
import { DrawingService } from "./services/DrawingService";
import { FolderService } from "./services/FolderService";
import { RestrictedService } from "./services/RestrictedService";

export class ServerRegistry {
  public static async bootstrap(env: Env.Private, sqlite: Sqlite): Promise<ServerRegistry> {
    return await new ServerRegistry(env, sqlite).initializeAll();
  }

  private readonly registry: Record<string, any> = {};

  private constructor(
    private readonly env: Env.Private,
    private readonly sqlite: Sqlite,
  ) {
    // Repositories
    const { folderRepository } = this.register({ FolderRepository }, [sqlite]);
    const { drawingRepository } = this.register({ DrawingRepository }, [sqlite]);

    // Services
    const { folderService } = this.register({ FolderService }, [folderRepository]);
    const { drawingService } = this.register({ DrawingService }, [drawingRepository, folderRepository]);
    const { restrictedService } = this.register({ RestrictedService }, [folderService, drawingService]);

    // Middleware
    const { loggingMiddleware } = this.register({ LoggingMiddleware }, []);
    const { basicAuthMiddleware } = this.register({ BasicAuthMiddleware }, [env]);
    const { middleware } = this.register({ Middleware }, [loggingMiddleware, basicAuthMiddleware]);

    // Server
    this.register({ Server }, [env, folderService, drawingService, restrictedService, middleware]);
  }

  /**
   * Initializes all components in the dependency order they were registered above
   */
  private async initializeAll(): Promise<ServerRegistry> {
    for (const instance of Object.values(this.registry)) {
      await Initialize.runAll(instance);
    }
    return this;
  }

  public get(sqlite: "sqlite"): Sqlite;
  public get(env: "env"): Env.Private;
  public get<T>(klass: Class<T>): T;
  public get<T>(klass: "sqlite" | "env" | Class<T>): Sqlite | Env.Private | T {
    if (klass === "sqlite") {
      return this.sqlite;
    }
    if (klass === "env") {
      return this.env;
    }
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }

  private register<N extends string, C extends Class>(
    classRecord: Record<N, C>,
    parameters: ConstructorParameters<C>,
  ): Record<Uncapitalize<N>, InstanceType<C>> {
    const entry = Object.entries(classRecord).at(0)!;
    const name = entry[0] as N;
    const Klass = entry[1] as C;
    const instance: InstanceType<C> = new Klass(...parameters);
    this.registry[Klass.name] = instance;
    return {
      [`${name[0].toLowerCase()}${name.slice(1)}`]: instance,
    } as Record<Uncapitalize<N>, InstanceType<C>>;
  }
}
