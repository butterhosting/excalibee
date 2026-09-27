import { Credentials } from "@/models/internal/Credentials";

export class AuthHelper {
  public static extractBearerToken(header: string | null | undefined): string | undefined {
    try {
      if (header) {
        const prefix = "Bearer ";
        if (header.toLowerCase().startsWith(prefix.toLowerCase())) {
          const token = header.slice(prefix.length);
          if (token) {
            return token;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  public static extractBasicAuth(header: string | null | undefined): Credentials | undefined {
    try {
      if (header) {
        const prefix = "Basic ";
        if (header.toLowerCase().startsWith(prefix.toLowerCase())) {
          const encodedCredentials = header.slice(prefix.length);
          if (encodedCredentials.length > 0) {
            const credentials = Buffer.from(encodedCredentials, "base64").toString("utf-8");
            if (credentials.includes(":")) {
              const [username, password] = credentials.split(":", 2);
              return { username, password };
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
