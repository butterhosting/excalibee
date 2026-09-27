export namespace ServerEndpoint {
  /**
   * Endpoints that bypass the basic-auth middleware.
   */
  export const Public = {
    health: "/health",
  } as const;
}
