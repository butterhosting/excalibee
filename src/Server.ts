import { Env } from "@/Env";
import { ServerError } from "@/errors/ServerError";
import { Initialize } from "@/Initialize";
import index from "@/website/index.html";
import { Temporal } from "@js-temporal/polyfill";
import { ErrorLike } from "bun";
import { Yexception } from "yexception";
import { DrawingError } from "./errors/DrawingError";
import { FolderError } from "./errors/FolderError";
import { Logger } from "./Logger";
import { Middleware } from "./middleware/Middleware";
import { Drawing } from "./models/Drawing";
import { DrawingScene } from "./models/DrawingScene";
import { Folder } from "./models/Folder";
import { ServerEndpoint } from "./ServerEndpoint";
import { DrawingService } from "./services/DrawingService";
import { FolderService } from "./services/FolderService";
import { RestrictedService } from "./services/RestrictedService";

/**
 * Excalidraw loads its fonts and locales relative to `window.EXCALIDRAW_ASSET_PATH`; without it, they come from a CDN.
 * A self-hosted app serves them itself, straight out of the installed package.
 */
const EXCALIDRAW_ASSETS = "node_modules/@excalidraw/excalidraw/dist/prod";

export class Server {
  private readonly log = new Logger(__filename);

  public constructor(
    private readonly env: Env.Private,
    private readonly folderService: FolderService,
    private readonly drawingService: DrawingService,
    private readonly restrictedService: RestrictedService,
    private readonly middleware: Middleware,
  ) {}

  @Initialize
  public listen() {
    const server = Bun.serve({
      development: this.env.EXCALISELF_STAGE === "dev",
      fetch: this.handleFetch(() => {
        return Response.json(ServerError.route_not_found().problemDetails(), { status: 404 });
      }),
      routes: {
        /**
         * HTML/API fallbacks
         *
         * Unfortunately, no middleware/basic-auth on the HTMLBundle right now; see
         * https://github.com/oven-sh/bun/issues/17595#issuecomment-2965865078
         */
        "/*": index,
        "/internal-api/*": this.handleRoute(() => {
          return Response.json(ServerError.route_not_found().problemDetails(), { status: 404 });
        }),
        "/excalidraw/*": this.handleRoute(async (request) => {
          const relative = new URL(request.url).pathname.replace("/excalidraw/", "");
          const file = Bun.file(`${EXCALIDRAW_ASSETS}/${relative}`);
          if (relative.includes("..") || !(await file.exists())) {
            return Response.json(ServerError.route_not_found().problemDetails(), { status: 404 });
          }
          return new Response(file, { headers: { "cache-control": "public, max-age=31536000, immutable" } });
        }),

        /**
         * Health (public: bypasses basic auth, so it can be used as a container healthcheck)
         */
        [ServerEndpoint.Public.health]: {
          GET: this.handleRoute(() => {
            return Response.json({ status: "ok" });
          }),
        },

        /**
         * Env
         */
        "/internal-api/env": {
          GET: this.handleRoute(() => {
            return Response.json(Env.onlyPublic(this.env));
          }),
        },

        /**
         * Folders
         */
        "/internal-api/folders": {
          GET: this.handleRoute(async () => {
            const folders: Folder[] = await this.folderService.list();
            return Response.json(folders);
          }),
          POST: this.handleRoute(async (request) => {
            const folder: Folder = await this.folderService.create(await request.json());
            return Response.json(folder);
          }),
        },
        "/internal-api/folders/:id": {
          PATCH: this.handleRoute(async (request) => {
            const folder: Folder = await this.folderService.update(request.params.id, await request.json());
            return Response.json(folder);
          }),
          DELETE: this.handleRoute(async ({ params }) => {
            const folder: Folder = await this.folderService.delete(params.id);
            return Response.json(folder);
          }),
        },

        /**
         * Drawings
         */
        "/internal-api/drawings": {
          GET: this.handleRoute(async () => {
            const drawings: Drawing[] = await this.drawingService.list();
            return Response.json(drawings);
          }),
          POST: this.handleRoute(async (request) => {
            const drawing: Drawing = await this.drawingService.create(await request.json());
            return Response.json(drawing);
          }),
        },
        "/internal-api/drawings/:id": {
          GET: this.handleRoute(async ({ params }) => {
            const drawing: Drawing = await this.drawingService.find(params.id);
            return Response.json(drawing);
          }),
          PATCH: this.handleRoute(async (request) => {
            const drawing: Drawing = await this.drawingService.update(request.params.id, await request.json());
            return Response.json(drawing);
          }),
          DELETE: this.handleRoute(async ({ params }) => {
            const drawing: Drawing = await this.drawingService.delete(params.id);
            return Response.json(drawing);
          }),
        },
        "/internal-api/drawings/:id/scene": {
          GET: this.handleRoute(async ({ params }) => {
            const scene: DrawingScene = await this.drawingService.getScene(params.id);
            return Response.json(scene);
          }),
          PUT: this.handleRoute(async (request) => {
            const drawing: Drawing = await this.drawingService.saveScene(request.params.id, await request.json());
            return Response.json(drawing);
          }),
        },
        "/internal-api/drawings/:id/thumbnail": {
          GET: this.handleRoute(async ({ params }) => {
            const png = await this.drawingService.getThumbnail(params.id);
            return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "no-cache" } });
          }),
        },

        /**
         * Restricted (never in production; the e2e suite starts from here)
         */
        "/internal-api/restricted/purge": {
          POST: this.handleRoute(async () => {
            if (this.env.EXCALISELF_STAGE !== "prod") {
              await this.restrictedService.purge();
              return new Response();
            }
            return Response.json(ServerError.route_not_found().problemDetails(), { status: 404 });
          }),
        },
      },

      /**
       * Error handling
       */
      error: (e) => this.handleError(e),
    });

    // ordinary log, so this is always printed (independent of log level)
    console.log(
      [
        "",
        `  🚀 \x1b[1mExcaliself started on ${Temporal.Now.plainDateTimeISO(this.env.EXCALISELF_TIMEZONE)
          .toString({ smallestUnit: "second" })
          .replace("T", " ")} (${this.env.EXCALISELF_TIMEZONE})\x1b[0m`,
        "",
        `  \x1b[1mServer\x1b[0m    ${server.url}`,
        "",
        `  \x1b[1mStage\x1b[0m     ${this.env.EXCALISELF_STAGE}`,
        `  \x1b[1mCommit\x1b[0m    ${this.env.EXCALISELF_COMMIT}`,
        `  \x1b[1mVersion\x1b[0m   ${this.env.EXCALISELF_VERSION}`,
        "",
        `  \x1b[1mLogging\x1b[0m   ${this.env.EXCALISELF_LOGGING}`,
        `  \x1b[1mTimezone\x1b[0m  ${this.env.EXCALISELF_TIMEZONE}`,
        "",
        ...(this.env.EXCALISELF_SUPPORTER
          ? [
              `  \x1b[1mMode\x1b[0m      Running with love ❤️`, //
            ]
          : [
              `  \x1b[1mMode\x1b[0m      Running normally`, //
              `            https://example.com/excaliself/love`, //
            ]),
        "",
      ].join("\n"),
    );
  }

  private handleFetch<C>(
    fn: (request: Request, server: Bun.Server<C>) => Response | Promise<Response>,
  ): (request: Request, server: Bun.Server<C>) => Promise<Response> {
    return (request, server) =>
      this.middleware.handle(request, async () => {
        return await fn(request, server);
      });
  }

  private handleRoute<T extends string>(
    fn: (req: Bun.BunRequest<T>) => Response | Promise<Response>,
  ): (req: Bun.BunRequest<T>) => Promise<Response> {
    return (request) =>
      this.middleware.handle(request, async () => {
        return await fn(request);
      });
  }

  private async handleError(e: ErrorLike): Promise<Response> {
    if (Yexception.isInstance(e)) {
      if (ServerError.unauthorized.matches(e)) {
        return Response.json(e.problemDetails(), {
          status: 401,
          headers: { "www-authenticate": "basic" },
        });
      }
      if (ServerError.forbidden.matches(e)) {
        return Response.json(e.problemDetails(), {
          status: 403,
          headers: { "www-authenticate": "basic" },
        });
      }
      if (FolderError.not_found.matches(e) || DrawingError.not_found.matches(e) || DrawingError.no_thumbnail.matches(e)) {
        return Response.json(e.problemDetails(), { status: 404 });
      }
      if (FolderError.name_taken.matches(e) || DrawingError.name_taken.matches(e)) {
        return Response.json(e.problemDetails(), { status: 409 });
      }
      return Response.json(e.problemDetails(), { status: 400 });
    }
    if (e.message?.includes("invalid input syntax for type")) {
      return Response.json(ServerError.invalid_request_body().problemDetails(), { status: 400 });
    }
    this.log.error("An unknown error occurred", e);
    return Response.json(ServerError.unknown().problemDetails(), { status: 500 });
  }
}
