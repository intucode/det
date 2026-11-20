// DET home-screen app: screen files and picture packs live on the phone, so the app opens anywhere.
// Written by det/tools/to_app.py; a new build changes VER (new screen files) and PIC_HASH (only changed packs refetch).
const VER = "cfdfe28c7ed6";
const SHELL = "det-shell-" + VER, PICS = "det-pics", FONTS = "det-fonts";
const SHELL_FILES = ["index.html", "det.webmanifest", "icon-180.png", "icon-512.png"];
const PIC_HASH = {"pics/t-change.json":"89d49542ef91","pics/t-mockphoto.json":"e9e3ee3c8ec1","pics/t-money.json":"5b8413322b1d","pics/t-people.json":"4b01094b8d60","pics/t-society.json":"8c8a5883542e","pics/t-study.json":"4a8d07d82973","pics/t-think.json":"0d112000d91a","pics/t-work.json":"a9b1b8c5f636"};
const BASE = new URL("./", self.location).pathname;          // "/det/"

function picKey(path) { const f = path.slice(BASE.length); return PIC_HASH[f] ? BASE + f + "?h=" + PIC_HASH[f] : null; }

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL)
    .then((c) => c.addAll(SHELL_FILES.map((f) => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k.startsWith("det-shell-") && k !== SHELL);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    // a screen opened from an older build reloads once into this one; older builds have no reload code of their own
    // (never awaited: the reload's own fetch waits until this worker is active)
    if (old.length) {
      for (const w of await self.clients.matchAll({ type: "window" })) {
        try { if (w.navigate) w.navigate(w.url).catch(() => {}); } catch (err) { /* next open gets the new page */ }
      }
    }
  })());
});

// the page itself: the network first, so a new build shows on the very next open; the saved copy only when the
// phone is offline, the server fails, or the answer takes longer than PAGE_WAIT (11-18 21:37)
const PAGE = BASE + "index.html", PAGE_WAIT = 4000;
async function pageFirst(e) {
  const c = await caches.open(SHELL);
  const net = fetch(new Request(PAGE, { cache: "no-cache" })).then(async (r) => {
    if (!r.ok) throw new Error("page " + r.status);
    await c.put(PAGE, r.clone());
    return r;
  });
  e.waitUntil(net.catch(() => {}));                         // a slow answer still updates the saved copy
  const slow = new Promise((ok) => setTimeout(ok, PAGE_WAIT)).then(() => c.match(PAGE));
  try {
    return await Promise.race([net, slow.then((hit) => hit || net)]);
  } catch (err) {
    return (await c.match(PAGE)) || new Response("offline", { status: 503 });
  }
}

async function fill() {
  const c = await caches.open(PICS), want = new Set();
  for (const f of Object.keys(PIC_HASH)) {
    const key = BASE + f + "?h=" + PIC_HASH[f];
    want.add(key);
    if (await c.match(key)) continue;
    try {
      const r = await fetch(new Request(f, { cache: "reload" }));
      if (r.ok) await c.put(key, r);
    } catch (err) { return; }                                // away from home: try again next open
  }
  for (const req of await c.keys()) {
    const u = new URL(req.url);
    if (!want.has(u.pathname + u.search)) await c.delete(req);
  }
}
self.addEventListener("message", (e) => { if (e.data === "fill") e.waitUntil(fill()); });

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === "opaque") c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
  const pk = picKey(u.pathname);
  const key = pk || (u.pathname === BASE ? PAGE : u.pathname);
  if (key === PAGE) { e.respondWith(pageFirst(e)); return; }
  e.respondWith(caches.open(pk ? PICS : SHELL).then(async (c) => {
    const hit = await c.match(key);
    if (hit) return hit;
    try {
      const r = await fetch(e.request);
      if (r.ok) await c.put(key, r.clone());
      return r;
    } catch (err) { return new Response("offline", { status: 503 }); }
  }));
});
