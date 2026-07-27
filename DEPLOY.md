# Running the Salmon prototype live

There are two parts. Pick based on what you want live.

## 1. Connected live demo (recommended — the real thing)

`demo/` is a Node/Express app: client + partner + admin sharing one live store
over Server-Sent Events. It needs a **Node host** — it cannot run on GitHub Pages.

### Option A — Render (free, ~2 minutes)
1. Go to https://render.com → **New +** → **Blueprint**.
2. Connect this repo (`sadiasajarun/salmon`). Render reads `render.yaml` and
   provisions a free web service (root `demo/`, `npm install`, `node server.js`).
3. Click **Apply**. When it's live you get a URL like
   `https://salmon-live-demo.onrender.com`.
   - Split view: `/`  ·  Admin: `/admin`  ·  Partner: `/partner`  ·  Client: `/client`

One-click: https://render.com/deploy?repo=https://github.com/sadiasajarun/salmon

> Free Render services sleep after inactivity and cold-start in ~30 s on the
> first hit. `data.json` is the runtime store and resets to `data.seed.json` on
> each fresh deploy — expected for a prototype.

### Option B — Run locally
```bash
cd demo
npm install
node server.js
# open http://localhost:3000
```

Other Node hosts work the same way (Railway, Fly.io, Glitch, a VPS): install in
`demo/`, run `node server.js`, expose `process.env.PORT`.

## 2. Static clickable prototypes (GitHub Pages)

The non-connected HTML prototypes (`app/` mobile screens, `crm-prototype/` admin
screens, root `index.html` landing) can go on GitHub Pages:

**Settings → Pages → Build and deployment → Source: Deploy from a branch →
`main` / root → Save.** Live at `https://sadiasajarun.github.io/salmon/`.

Note: Pages serves only these static prototypes. The connected demo in `demo/`
will not function there (its `/api/*` and SSE need the Node server from part 1).
