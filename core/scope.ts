/**
 * A Scope is the tenancy boundary every query in the portal core runs inside.
 *
 * It is supplied when the core is constructed, never as a call argument, so a
 * client-scoped core has no way to express a query that reaches another client.
 */
export type Scope =
  | { readonly kind: "admin" }
  | { readonly kind: "client"; readonly clientId: string };

/** Full access. Used by the MCP server, which only ever serves the portal owner. */
export function adminScope(): Scope {
  return { kind: "admin" };
}

/**
 * Access limited to a single client's own records.
 *
 * The id must come from a trusted server-side source such as the session
 * cookie. Passing a value that originated in a request body hands the caller
 * the choice of tenant.
 */
export function clientScope(clientId: string): Scope {
  return { kind: "client", clientId };
}

export function isAdmin(scope: Scope): scope is { kind: "admin" } {
  return scope.kind === "admin";
}

/**
 * Resolves the clientId a query should filter on.
 *
 * Under a client scope the caller's requested value is discarded rather than
 * checked, so a mismatch cannot leak through as an error message either.
 */
export function resolveClientId(scope: Scope, requested?: string): string | undefined {
  return scope.kind === "client" ? scope.clientId : requested;
}

/** True when a row belonging to `ownerId` is outside the scope's reach. */
export function isForeign(scope: Scope, ownerId: string): boolean {
  return scope.kind === "client" && scope.clientId !== ownerId;
}
