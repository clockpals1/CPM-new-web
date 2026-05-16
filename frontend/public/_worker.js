/**
 * Cloudflare Pages Advanced Mode Worker — SPA routing
 *
 * When _worker.js is present in the deployed assets directory, Cloudflare Pages
 * runs this Worker for every request instead of its default static-file serving.
 * The ASSETS binding gives access to all deployed static files.
 *
 * Strategy:
 *  1. Try to serve the requested path as a real static asset.
 *  2. If it is not found (404), serve /index.html with status 200 so React
 *     Router can handle the route on the client side.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. Attempt to serve the actual static file ---
    try {
      const assetResponse = await env.ASSETS.fetch(request.clone());
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch (_) {
      // Asset fetch threw — fall through to SPA shell
    }

    // --- 2. SPA fallback: serve index.html at 200 ---
    try {
      const indexRequest = new Request(
        new URL("/index.html", url.origin).href,
        { method: "GET", headers: { Accept: "text/html" } }
      );
      const indexResponse = await env.ASSETS.fetch(indexRequest);
      return new Response(indexResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (e) {
      return new Response("Service temporarily unavailable", { status: 503 });
    }
  },
};
