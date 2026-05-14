// Minimal SW: cache-first for Supabase GETs so cold-start offline still hydrates the UI.
const CACHE_NAME = "supabase-get-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.hostname.endsWith(".supabase.co")) return;
  if (!url.pathname.startsWith("/rest/v1/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const networkP = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      if (cached) {
        networkP.then(() => {});
        return cached;
      }
      const net = await networkP;
      if (net) return net;
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    })()
  );
});
