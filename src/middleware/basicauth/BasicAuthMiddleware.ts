import { Env } from "@/Env";
import { ServerError } from "@/errors/ServerError";
import { AuthHelper } from "@/helpers/AuthHelper";
import { Initialize } from "@/Initialize";
import { Credentials } from "@/models/internal/Credentials";
import { ServerEndpoint } from "@/ServerEndpoint";
import { MiddlewareHandler } from "../MiddlewareHandler";

type HashedCredentials = {
  username: string;
  passwordHash: string;
};

export class BasicAuthMiddleware implements MiddlewareHandler {
  private enabled?: boolean;
  private hashedCredentials?: HashedCredentials[];

  public constructor(private readonly env: Env.Private) {}

  @Initialize
  public async initializeFromDisk() {
    const htpasswd = Bun.file(this.env.EXCALISELF_HTPASSWD);
    if (await htpasswd.exists()) {
      const content = await htpasswd.text();
      this.enabled = true;
      this.hashedCredentials = content
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line) => line.split(":", 2))
        .map(([username, passwordHash]) => ({ username, passwordHash }));
    } else {
      this.enabled = false;
    }
  }

  public async apply(request: Request, next: () => Promise<Response>): Promise<Response> {
    if (typeof this.enabled !== "boolean") {
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
    }
    const { pathname } = new URL(request.url);
    if (this.enabled && !Object.values<string>(ServerEndpoint.Public).includes(pathname)) {
      const { accessGranted } = await this.authenticate(request.headers);
      if (!accessGranted) {
        return Response.json(ServerError.unauthorized().problemDetails(), {
          status: 401,
          headers: { "WWW-Authenticate": "Basic" },
        });
      }
    }
    return await next();
  }

  private async authenticate(headers: Headers): Promise<{ accessGranted: boolean }> {
    const credentials = AuthHelper.extractBasicAuth(headers.get("Authorization"));
    if (!credentials) {
      return { accessGranted: false };
    }
    const validCredentials = await this.validateCredentials(credentials);
    if (!validCredentials) {
      return { accessGranted: false };
    }
    return { accessGranted: true };
  }

  private async validateCredentials(credentials: Credentials): Promise<boolean> {
    if (!this.hashedCredentials) {
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
    }
    for (const { username, passwordHash } of this.hashedCredentials) {
      if (credentials.username === username) {
        if (await Bun.password.verify(credentials.password, passwordHash)) {
          return true;
        }
      }
    }
    return false;
  }
}
