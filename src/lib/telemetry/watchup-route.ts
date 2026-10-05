const routeTypes = new Set(["render", "route", "action", "proxy"]);

export function unhandledErrorRoute(routePath: unknown, routeType: unknown): string {
  if (typeof routePath !== "string" || !/^\/[A-Za-z0-9_/@()[\].-]{0,160}$/.test(routePath)) return "server_unhandled";
  if (typeof routeType !== "string" || !routeTypes.has(routeType)) return "server_unhandled";
  return `server_unhandled:${routeType}:${routePath}`;
}
