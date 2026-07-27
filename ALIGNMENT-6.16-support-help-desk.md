# Alignment — Support & Help Desk (Req 6.16)

> **Filename note:** the repo's `ALIGNMENT.md` is being written by concurrent passes on
> other requirements. This 6.16 audit lives in `ALIGNMENT-6.16-support-help-desk.md`
> (matching the `ALIGNMENT-6.x-<name>.md` convention already in the tree).

Build-and-align pass. The prototype had a thin ticket inbox (`{dept, subject, body,
status: open|closed, replies[]}`) — a form inbox, not a help desk. This pass rebuilds it
into an **industry-standard CRM help desk** (Zendesk/Freshdesk feel): SLA aging that
makes the queue legible, full threaded history, priority/assignment/status workflow,
volume + aging summaries, and the client's **one approved real-time channel** behind a
clean seam. Built in `demo/` where it can ripple and audit across surfaces.

Surfaces:
- **Staff (CRM)** — `demo/public/admin/app.js`: SP01 inbox · SP02 detail · SP03 summary · SP04 client-chat console.
- **Partner (mobile)** — `demo/public/partner/app.js`: P70 raise · P71 thread.
- **Client (mobile)** — `demo/public/client/app.js`: the approved real-time channel.
- **Server (the ripple + audit point)** — `demo/server.js`: ticket model, endpoints, SLA, channel seam.

## Clause status (after this pass)

| # | Clause | Before | After | What changed |
|---|--------|--------|-------|--------------|
| 6.16.1 | Partner submits ticket to Customer Care / Sales / Accounts / Administration with category, subject, description, attachment | **Partial** — 3-dept select, subject, body only | **Done** | P70 captures the four real **categories** + priority + subject + description + attachment. `POST /api/tickets` auto-routes by category (`CATEGORY_ROUTING`) to the owning role. |
| 6.16.2 | Support users assign, prioritize, respond, resolve, reopen — with full conversation history | **Partial** — reply + close only | **Done** | SP02 has assign-owner, set-priority, status (open/in_progress/resolved/reopened), respond, resolve, reopen. Every ticket carries a **threaded `conversation` history** (requester + staff turns, chronological) + an activity log. Endpoints: `/reply`, `/assign`, `/priority`, `/status`, `/reopen`, `/message`, `/bulk`. |
| 6.16.3 | Partner tickets + click-to-call/external links; client gets ONE approved real-time channel (WhatsApp API **or** in-app chat) — no custom voice/video | **Missing** (client) | **Done** | Two channels, never conflated. Partner = ticket system + click-to-call (`tel:` links). Client = one channel behind `config.clientSupportChannel` (`in_app` \| `whatsapp`). In-app = a real thread (agent identity, status, history, ref). WhatsApp = honest handoff (`wa.me` link) + a ticket **stub** (reference + status), **no faked transcript**. No custom voice/video anywhere. |
| 6.16.4 | Notify partner on ticket update/resolution | **Partial** | **Done** | Every reply/status/resolve/reopen calls `notifyRequester` → the requester's notification centre + a live SSE toast on their mobile. Client chat replies notify the client too. |
| 6.16.5 | CRM shows ticket volume, response-status, aging summaries | **Missing** | **Done** | SP03: volume by status/category/source, response-status (open/in-progress/resolved + **avg first-response** and **avg resolution** timing), and **aging buckets** (<4h / 4–24h / 1–2d / 2d+ breached). KPI row + reused bar/pill idioms — no new chart component. |

## The standout — SLA aging that makes the queue feel alive

`ticketSla(t)` computes `{ ageMs, targetMs, pct, state }` where state ∈ `ok / approaching
(≥75%) / breached (≥100%)`; resolved tickets never age. Per-priority targets
(`SLA_HOURS`: urgent 4h · high 8h · normal 24h · low 48h). SP01:
- Default sort is **aging-first** (breached → approaching → ok → resolved).
- The age cell warns **softly** — amber at approaching, red + ⚠ at breach — colour, not alarm.
- A soft banner surfaces the count breaching SLA.

Seeded so the demo shows all states at once (verified on an isolated instance):
```
TKT-0071 partner Accounts       urgent open        10h/4h   BREACHED
TKT-0072 partner Sales          high   in_progress  7h/8h   approaching
TKT-0073 partner Customer Care  normal open         2h/24h  ok
TKT-0068 partner Administration low    resolved     —       (met)
TKT-0065 partner Accounts       normal reopened    96h/24h  BREACHED
TKT-0074 client  Customer Care  normal in_progress  1.5h/24h ok
```

## Client channel — two options, one honest choice

Behind `config.clientSupportChannel`, switchable from SP04:
- **In-app chat** (`in_app`, default): `/api/chat/start` opens/continues a real client
  ticket rendered as a chat thread — agent name, status, full history, reference.
  `/api/tickets/message` posts the client's turn.
- **WhatsApp** (`whatsapp`): `/api/chat/start` returns a `wa.me` handoff link + creates a
  ticket **stub** whose only in-app content is a system note: *"Conversation continues on
  WhatsApp Business — this stub tracks reference and status only. No transcript is stored
  in-app."* The client screen shows the handoff + the status stub; SP02/SP04 show the same.
  **No transcript we don't hold is ever rendered** (verified).

## What NOT to build — checked

- [x] **No custom voice/video** — external/managed channels only.
- [x] **No faked WhatsApp transcript** — stub + system note only; the thread is never populated with invented messages.
- [x] **One approved channel** — a single config value; switching is a seam, not a second inbox.
- [x] **No new table/chart components** — SP03 reuses the existing pill + inline-bar + KPI idioms.
- [x] **No AI-drafted replies** — staff type their own responses.

## Ripples & audit (all verified on the isolated instance)

- Partner raises ticket → SP01 (auto-assigned per category) + admin notification.
- Staff reply → sets `in_progress` + stamps `firstResponseAt`; partner P71 updates + notified.
- Staff resolve → partner notified; partner can **reopen** → back in the queue (`reopened`).
- Bulk assign/priority/resolve across selected tickets.
- Client starts in-app chat → SP04 + admin; reply → client notified live.
- Switch channel to WhatsApp → client surface flips to handoff + stub.
- Every action writes a per-ticket `history` entry (actor · action · note) + a live feed arrow.

## Done-when checklist

- [x] All five clauses mapped with the diff
- [x] SP01 is an industry-standard queue — SLA aging, priority, filters (source/category/status/priority/search), bulk actions
- [x] SP02 keeps full conversation history with assign/prioritize/respond/resolve/reopen
- [x] SP03 shows volume, response-status and aging — the help-desk view
- [x] Client chat is one approved channel; WhatsApp as honest handoff + stub; no faked transcript; no custom voice/video
- [x] Partner raise/thread/reopen works, click-to-call present, notified on updates
- [x] Every action ripples and audits; reuses shared components
- [x] 5 open questions logged (`demo/OPEN_QUESTIONS.md`)

> **To see it live:** restart `demo/server.js`, then click **Reset** in the top bar to load
> the new seed. `normalizeTickets` also upgrades any legacy `data.json` in place.
