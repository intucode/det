// DET home-screen app: screen files and picture packs live on the phone, so the app opens anywhere.
// Written by det/tools/to_app.py; a new build changes VER (new screen files) and PIC_HASH (only changed packs refetch).
const VER = "79633acadfdf";
const SHELL = "det-shell-" + VER, PICS = "det-pics", FONTS = "det-fonts";
const SHELL_FILES = ["index.html", "det.webmanifest", "icon-180.png", "icon-512.png"];
const PIC_HASH = {"pics/t-amount-0.json":"0ed23e932baa","pics/t-amount-1.json":"938cab0f1846","pics/t-change-0.json":"a44f99664cc1","pics/t-change-1.json":"d7e907c98863","pics/t-change-2.json":"90b2a576aefb","pics/t-health-0.json":"614d84dc5b27","pics/t-health-1.json":"2da2639ec4a8","pics/t-health-2.json":"87264951fd5f","pics/t-link-0.json":"53d482e2db6b","pics/t-link-1.json":"d6579eaadd84","pics/t-mind-0.json":"5d27eee38506","pics/t-mind-1.json":"cd2b3f500d20","pics/t-mind-2.json":"c3e45ffca0d2","pics/t-mind-3.json":"7858453e43e3","pics/t-mind-4.json":"acc1aa6cc83d","pics/t-mind-5.json":"1172cfeb5572","pics/t-mockphoto.json":"e9e3ee3c8ec1","pics/t-money-0.json":"0028cf3cfd90","pics/t-money-1.json":"01adf94724d7","pics/t-nature-0.json":"427e6998370c","pics/t-nature-1.json":"b8f28f0fddf7","pics/t-nature-2.json":"535d5f60656a","pics/t-nature-3.json":"26b225722e67","pics/t-nature-4.json":"e9cac4aad6d4","pics/t-nature-5.json":"f909d5aec3a6","pics/t-people-0.json":"09ffa3c9537d","pics/t-people-1.json":"4293ec9f2c93","pics/t-people-2.json":"5b14aeb244be","pics/t-people-3.json":"ba44a5f2bd6d","pics/t-people-4.json":"c32cd17139f3","pics/t-people-5.json":"0ce5e3b7c838","pics/t-people-6.json":"3ffe2ff5ac53","pics/t-people-7.json":"594a8a154cc2","pics/t-science-0.json":"e153a549bd8b","pics/t-science-1.json":"ffbcd32172b2","pics/t-science-2.json":"0414199cf9a5","pics/t-society-0.json":"03d106e4ebff","pics/t-society-1.json":"b6d2d7c97419","pics/t-society-2.json":"39bac02aeceb","pics/t-society-3.json":"2c78c1ff592f","pics/t-society-4.json":"5fc804d7a580","pics/t-study-0.json":"deba1fccadbf","pics/t-study-1.json":"042502487470","pics/t-talk-0.json":"f527440d2bd2","pics/t-talk-1.json":"3fced737a370","pics/t-think-0.json":"62ffd554bf23","pics/t-think-1.json":"7ef09f57c270","pics/t-think-2.json":"457ad58bbe64","pics/t-time-0.json":"aa977e078b6d","pics/t-time-1.json":"b5056566f401","pics/t-vex0.json":"6057a4705ac4","pics/t-vex1.json":"5dd392910d64","pics/t-vex2.json":"83a580ce3d54","pics/t-vex3.json":"b820e32fd68d","pics/t-vex4.json":"cdb23c887f43","pics/t-vil0.json":"34e1a29d9f95","pics/t-vil1.json":"02618e94edf3","pics/t-vil2.json":"015a7e061f74","pics/t-vil3.json":"a83e3c1c9661","pics/t-vlt0.json":"8097a2d49f6e","pics/t-vsp0.json":"500ae9f5e348","pics/t-vsp1.json":"77cc26de5d3b","pics/t-vsp2.json":"9ae0e41c8e24","pics/t-vsp3.json":"d353cd7f72d6","pics/t-vsp4.json":"f869963559b2","pics/t-vsp5.json":"1273084430f3","pics/t-vsp6.json":"50388a666fde","pics/t-vsp7.json":"feda81b47658","pics/t-vsp8.json":"98d4520f74ed","pics/t-vw0.json":"47771cc84c02","pics/t-vw1.json":"bac23d9a7477","pics/t-vw2.json":"919f522feb30","pics/t-vw3.json":"d04b07aae813","pics/t-vw4.json":"4c50c19a4cef","pics/t-vw5.json":"6f3f2ebcf797","pics/t-work-0.json":"1cb124c2670c","pics/t-work-1.json":"83fca715a3aa","pics/t-work-2.json":"a066c32ea4be","pics/t-work-3.json":"ae45ab0fa5b4"};
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
