/**
 * Public storefront CMS routes (no admin auth), parallel to
 * `GET /api/v1/pages` / `GET /api/v1/pages/:slugOrId`.
 *
 * **Site chrome** responses are **flat**: `{ success: true, ...layoutRootKeys }` from the first
 * active section’s **`configValues`**. **Announcements** when **`enabled: false`**: only
 * `{ success: true, enabled: false }` — no layout keys. Not the nested admin document shape.
 */

export function publicCmsNavigationApiPath() {
  return `/api/v1/navigation`;
}

export function publicCmsFooterApiPath() {
  return `/api/v1/footer`;
}

export function publicCmsAnnouncementsApiPath() {
  return `/api/v1/announcements`;
}

export function publicCmsPageApiPath(slugOrId: string) {
  return `/api/v1/pages/${encodeURIComponent(slugOrId)}`;
}

export function publicCmsCollectionApiPath(key: string) {
  return `/api/v1/collections/${encodeURIComponent(key)}`;
}

/**
 * Public resolver: `GET` with path segments after `/api/v1/dynamic-route/` (readable in the URL bar).
 * Same behavior as {@link publicCmsDynamicRouteApiQueryPath} — still supported for older clients.
 */
export function publicCmsDynamicRouteApiPath(pathSegments?: string) {
  const normalized =
    pathSegments?.trim().replace(/^\/+/, "").replace(/\/+$/, "") || "example/segment";
  const encoded = normalized
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/api/v1/dynamic-route/${encoded}`;
}

/**
 * Same resolver using `?path=` (nested paths stay in one query value). The API implements both.
 */
export function publicCmsDynamicRouteApiQueryPath(pathSegments?: string) {
  const p =
    pathSegments?.trim().replace(/^\/+/, "").replace(/\/+$/, "") || "example/segment";
  return `/api/v1/dynamic-route?path=${encodeURIComponent(p)}`;
}

/** Build a sample `path=` value from a route pattern by substituting static segments and using "example" for each `:param`. */
export function examplePathForDynamicRoutePattern(pattern: string): string {
  const trimmed = pattern.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return "example-segment";
  return trimmed
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith(":") ? "example" : seg))
    .join("/");
}

/** Short label for long API paths (middle ellipsis). */
export function trimPublicApiPathDisplay(path: string, max = 42): string {
  const t = path.trim();
  if (t.length <= max) return t;
  const head = Math.floor((max - 1) / 2);
  const tail = max - 1 - head;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}
