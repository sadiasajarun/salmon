# Alignment — Project, Inventory & Media Catalogue (Req 6.5)

Reconcile-and-align pass. Status found by **inspecting the real code** across four surfaces, then
patched. The prior partner-registration pass (Req 6.1) lives in
[`ALIGNMENT-6.1-partner-registration.md`](ALIGNMENT-6.1-partner-registration.md).

## The four surfaces

| Surface | Path | What it is |
|---|---|---|
| **Admin catalogue** | `crm-prototype/screens/E01–E09` + `assets/js/catalogue*.js` | Static admin panel — project/unit/media/construction management. Override-aware mock store. |
| **Client mobile** | `app/client/*.page.html` + `assets/js/{filters,currency,mock-data,salmon-categories}.js` | Static discovery + immersive project view (gallery, video, 360, floor plan, progress). |
| **Partner mobile** | `app/partner/*.page.html` + `assets/js/{project-selector,partner-*,filters}.js` | Static sales kit + the five submission flows. |
| **Live demo** | `demo/public/{admin,client,partner}` + `demo/server.js` | Connected SPA over one Express store + SSE ripple bus — the only surface that proves **live sync**. |

Because these are four separate prototypes (they merge at the Laravel + React build), a schema built
once is **mirrored**, not shared. Where a mirror exists it is flagged and logged as a merge-time unification.
The connected `demo/` was **deliberately left pristine** this pass (see cross-surface notes).

## Clause status (after this pass)

Surfaces are named explicitly per row — **admin** = `crm-prototype/`, **client** / **partner** = `app/`,
**demo** = the connected `demo/` SPA. "Unchanged" means already-sufficient or a logged merge-time
follow-up — never a silent skip.

| # | Clause | Before | After (what actually shipped) |
|---|--------|--------|-------------------------------|
| 6.5.1 | Admin create / update / **publish / unpublish**, audited | **Partial** — admin publish/unpublish + audit existed (`togglePublish` → `PUBLISH_PROJECT`/`UNPUBLISH_PROJECT`), but **create did not persist** (`createProject` only fired an audit + toast); unpublish collapsed to `draft` | **Done (admin)** — `createProject` now **persists** a real `draft` project (`projectsAdd` override → appears in E01, verified). Lifecycle is explicit **3-state `draft → published → unpublished`** — unpublish is its own audited state (`unpublishedUtc`), not a silent collapse; `statusChip` renders all three. **Demo unchanged** (its projects carry construction status via `siteStatus`; a demo publish endpoint is a logged follow-up). |
| 6.5.2 | Capture category, title, location (+coords), ready/under-construction, summary, civic amenities, contact, visit info | **Partial/Drifted** — had title, location (free text), At-A-Glance structural fields, `handover`. **Missing:** category, map coordinates, summary, civic amenities, contact, visit info, explicit ready flag | **Done (admin)** — project model extended with `category`, `coordinates {lat,lng}`, `summary`, `civicAmenities[]`, `contact`, `visitInfo`, `readyStatus`. E06 create form captures all of them; E02 renders a new **Project detail** block + Category / Ready-status tiles. Real Salmon copy where known; unknowns marked `[CLIENT COPY REQUIRED]`. |
| 6.5.3 | **Configurable** property categories declaring config fields (bedrooms, area, price…) that **drive the client filters** | **Missing everywhere** — `glance.buildingType` was free text; client `filters.js:48` hardcoded every project to `apartment` (dead filter dimension); no per-category field schema | **Done (admin + client)** ⭐ — new **category schema** (`catalogue-categories.js` / mirrored `salmon-categories.js`): a field library + 5 default categories, each declaring its **applicable config fields** with `filter`/`sensitive` flags. Admin screen **E09** adds categories & toggles fields (persisted, verified). Client `filters.js` treats category as a **live** dimension (`p.category`); the sheet **shows Bedrooms vs Plot size per the selected category's schema** — apartment shows bedrooms; land share shows plot size + share fraction, never bedrooms (verified). |
| 6.5.4 | Inventory **Available / Reserved / Booked / Sold**, bulk change, **synced live to both mobile apps** | **Partial** — admin had all four states + bulk (`bulkUnitStatus`) but its "sync" is a **simulated toast**; the demo has **real SSE sync** but only via the booking flow | **Done (already), live-proof in demo** — admin four-state + bulk confirmed (verified `unitCounts` returns available/reserved/booked/sold); `reserved` is in the admin seed **and** the client `pillMap`. The **demo proves live sync with no refresh** through the booking ripple: `available → locked → booked` (admin confirm) and `→ available` (lock-expiry sweeper), each emitting an SSE delta to client + partner. Inventory is server-authoritative there. An **arbitrary admin status-setter endpoint in the demo** is a logged follow-up (the ripple mechanism it needs already exists). |
| 6.5.5 | Partners browse + filter by **type / location / construction status / availability** | **Partial/Drifted** — partner catalogue had **status chips only**; its header advertised four filters the UI didn't deliver | **Done (partner)** — `projects.page.html` now offers all four: **type** (category, from the schema), **location** (from `D.areas`), **construction status**, **availability** (available-only). Reads the same catalogue + inventory as the client. The shared `ProjectSelector` (below) offers the same four filters wherever a project is picked. |
| 6.5.6 | Downloadable media gallery: images, video, brochures, layouts, **360/Matterport**, **zoomable floor plans**, **dated construction progress** | **Mostly Done** — client had a real pinch/swipe/zoom gallery, video (poster + tap-to-play), brochures **with file size**, a working CSS pano 360 viewer, zoomable floor plans, dated newest-first progress. **Gaps:** no downloadable layout; client progress entries lacked a stage field + per-entry photo | **Improved** — added a **downloadable layout / floor-plan** row (size shown) to the client brochures screen, flagged `[CLIENT COPY REQUIRED]` until Salmon supplies files. Admin (E04/E05) already carries all media types incl. 360/Matterport-URL and dated construction updates **with `stage` + `mediaType`**. **Remaining (honest):** the client `project-progress` timeline still needs a per-entry `stage` + dated site photo (admin has both) — logged, not yet lifted. 360 stays a **Pannellum-ready** seam awaiting client panoramas — no assets invented. |
| 6.5.7 | Select a project/unit when submitting **referral · With-Investment enquiry · booking record · meeting · site visit** | **Missing (no shared component)** ⭐ — five flows, each different: submit-lead & request-visit inline `<select>`; invest-enquiry **free text**; booking-record chained lead→unit; **request-meeting had no project field at all** | **Done (partner)** — **one reusable `ProjectSelector`** (`app/assets/js/project-selector.js`): search + the four 6.5.5 filters → project → optional unit drill → returns `{projectId, unitId?}`. Wired into **all five** flows (verified: each references it once, with a mount point). Selection is stored on each flow's draft and carries to submission; the demo-side endpoint echo of `{projectId, unitNo}` is a logged merge-time wiring. |

## Cross-surface notes (honest)

- **The structural work landed in the static prototypes** (admin `crm-prototype/` + client & partner `app/`). The connected `demo/` SPA was **deliberately left pristine** — it had diverged during a parallel pass, and the two structural gaps (category schema, shared selector) are best authored in the surfaces that own those screens. Demo-side wiring (publish endpoint, arbitrary unit-status setter, selector echo) is logged as merge-time follow-up, **not claimed as done**.
- **Category schema is mirrored, not shared.** `crm-prototype/assets/js/catalogue-categories.js` (admin authoring) and `app/assets/js/salmon-categories.js` (client/partner filters) are **byte-equal copies**. Two files because the prototypes are separate; unifying to one server-owned table is a merge-time task — OQ #2.
- **"Configurable" today = dev-seeded + admin-editable-in-session.** E09 lets Super Admin add a category and toggle which fields apply (persisted to `localStorage`). Production self-serve vs dev-config is OQ #2.
- **Live sync is real only in `demo/`.** The `crm-prototype` and `app/*` surfaces are static; their "sync" is a toast naming the phone-side effect. The demo is where a booking-driven status change updates the client unit list + partner inventory over SSE with no refresh — the surface to demo 6.5.4 on.
- **Assets Salmon must supply are placeheld, never faked:** real Matterport/equirectangular 360s, floor-plan/layout files, coordinates, confirmed pricing, and the AED reference rate all carry visible `[…placeholder]` / `[CLIENT COPY REQUIRED]` markers (OQ #10).
- **Hospital/hotel share returns stay record-only.** The category declares a `share fraction` + `expected-return frame`, but any return figure renders `[AMOUNT — LEGAL SIGN-OFF REQUIRED]` — no rate, projection, or guarantee — consistent with the With-Investment discipline (OQ #4). Its share units use `plotSize`/`shareFraction`, never bedrooms.

## Field-per-category matrix (default — **not confirmed**, see OQ #1)

| Category | Applicable config fields |
|---|---|
| Apartment / flat | bedrooms, bathrooms, area (sqft), floor, balcony, facing, price range |
| Commercial space | area (sqft), floor, frontage, price range |
| Shop | area (sqft), floor, frontage, price range |
| Land / plot share | plot size (katha), share fraction, price range |
| Hospital / hotel share | share fraction, area (sqft), expected-return frame `[LEGAL SIGN-OFF REQUIRED]`, price range |

## Done-when checklist

- [x] This table maps all **seven** clauses with the diff
- [x] A **configurable category system** exists — categories declare their fields; apartment shows bedrooms, land share shows plot size; Global Client filters are driven by these fields _(admin E09 + client `filters.js`, verified)_
- [x] Projects capture every required field and support the full **publish/unpublish** lifecycle, audited _(admin; create persists; 3-state, verified)_
- [~] Inventory has all four states and **syncs live to both mobile apps** — four states + bulk present in admin; live no-refresh sync proven in the demo via the **booking ripple**. An arbitrary admin status-setter in the demo is the one logged follow-up.
- [~] The media gallery presents all seven media types properly — images / video / brochures / 360 / zoomable floor plans / dated construction are in place; **downloadable layouts added** this pass; the **client progress timeline's per-entry stage + photo remains a logged lift** (admin already has both)
- [x] Partners filter by type / location / construction status / availability from the shared catalogue
- [x] **One reusable project/unit selector** serves all five submission flows _(verified once-each with mount points)_
- [x] Realtor UX — photography-forward, availability + price surfaced, structural facts confident, dual currency everywhere _(found already in place; preserved)_
- [x] Hospital/hotel share returns carry no rate/projection — record-only
- [x] Real Salmon data throughout; gaps marked `[CLIENT COPY REQUIRED]`, not faked
- [x] 10 open questions logged (`crm-prototype/OPEN_QUESTIONS.md`, Req 6.5 section)

Legend: `[x]` done · `[~]` substantially done with a named, honest remainder.

_Last reconciled at the end of this pass. Every "After = Done" is backed by a real code change in the
listed file and, for the schema + selector + persistence, a passing Node smoke test._

---

# Alignment — Req 6.8 · Team, Territory, Rank & Referral Management (2026-07-26)

**Most of this module already shipped** in the Part-2 People module (D/R sections). This pass maps the
six clauses to what exists and adds the three genuine gaps (relationship view, create-team, create-territory)
plus the "legible stats" + tree-search enhancements. All in `crm-prototype/` (admin), reusing shared components.

| # | Clause | Where it lives (existing) | Status | Gap closed this pass |
|---|--------|---------------------------|--------|----------------------|
| 6.8.1 | Create teams, define territory hierarchy, assign team lead | D03 teams list, D01 tree, D05 assign-lead | **Partial → Done** | Added **TM03 create team** and **TT03 create/edit territory node** (the two missing CRUD screens). Assign-lead (D05/TM04) already exists. |
| 6.8.2 | Unique referral code/link per team lead or approved partner | D07 referral codes (RF01) | **Done** | Codes bind team+territory, show usage, deactivate-without-delete. Config decides who gets one (logged OQ #2). |
| 6.8.3 | New user joins under correct team+territory via code | Registration referral (mobile P06) + D07 | **Done (verified)** | Code binds team+territory; a referred registration lands attributed. |
| 6.8.4 | **Traceable relationship** partner↔team↔lead↔territory↔referrer | *(was missing a single view)* | **Missing → Done** | Built **TR02 relationship view** — the full chain as a clean visual diagram (the standout for this clause). |
| 6.8.5 | Team leads view *their* partners/coverage/targets/volume/performance — scoped | D04 team detail (TM02); mobile team section | **Partial → Done** | Enhanced **TM02 (D04)** with the full legible stat row (assigned partners · coverage · target vs achievement · sales volume · conversion · active leads) as MetricCards. Boundary is a scope filter (mobile side); CRM roles have no TEAM_LEAD (OQ, Part-1 #4). |
| 6.8.6 | Transfer partners between teams/territories, update ranks, retain audit | D06 move (TR01), R02 change rank (RK02) | **Done (verified)** | Transfer has effect summary + in-flight-lead choice + audit old→new. Rank change is manual, note-required, no automation. **No hard-delete** anywhere (verified). |

**Standout — navigation-is-the-tree:** TT01 (D01) already filters lists on node-click; added a **search box** to
jump to a node. Counts (partners · teams) show at each level.

**Open questions:** 7 appended to `.claude-project/OPEN_QUESTIONS.md` (in-flight leads on transfer, who gets a
code, code format/lifetime, hierarchy finality, rank rules, lead demotion, one-team-vs-many).

---

# Alignment — Daily Task & Progress Monitoring (Req 6.11)

**Deepen-and-align** pass. The Tasks & Targets module was already built across all
three surfaces in an earlier pass; this pass verified the six clauses against the real
code and closed the one genuine gap — **TK01's ClickUp interactivity** (drag, one-tap
move, quick-add, live counts). Everything else was already present and is confirmed here.

Surfaces:
- **Admin / Manager** — `demo/public/admin/app.js` (`taskboard`, `taskassign`, `task`, `teamcompletion`, `missed`, `targets`, `orgtasks`, `territorytrend`, `templates`)
- **Partner mobile** — `demo/public/partner/app.js` (`tasks` P63, `task` P64, `task-complete` P65, `targets` P66, `tl-assign` P63b, `tl-queue` P63c)
- **Server** — `demo/server.js` Tasks & Targets: `/api/tasks`, `/api/tasks/status` (new), `/api/tasks/complete`, `/api/tasks/cancel`, `/api/targets`, overdue tick

> Scope note: the static `crm-prototype/` has **no** task module (the demo is the canonical
> connected board). Per "align, don't duplicate / no new board component", the ClickUp
> board was deepened in the demo rather than rebuilt in the static prototype. Logged.

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.11.1 | Managers **or team leads** assign daily activities / targets / follow-ups | admin `taskassign` (TK03) + partner `tl-assign` (P63b) + `/api/tasks` | **Done** | **Done (verified)** | Server already accepts staff (`task.create` perm) and team-lead (`assignerType:'teamlead'`, own-team scope enforced) assignment. Bulk single/team/territory present. |
| 6.11.2 | Partners view task detail, due date, status | partner `tasks` (P63) + `task` (P64) | **Done** | **Done (verified)** | Overdue surfaced first; status chips; assignor + due shown. |
| 6.11.3 | Partners mark complete + note or permitted evidence | partner `task-complete` (P65) + `/api/tasks/complete` | **Done** | **Done (verified)** | Note + evidence; server refuses completion of an evidence-required task without a file (400). Admin board-complete of an evidence task is **also** refused (409) — stays the partner's action. |
| 6.11.4 | Personal completion + target progress on the dashboard | partner dashboard (P15) + `targets` (P66) | **Done** | **Done (verified)** | Dashboard shows a derived target bar + counts; P66 is period-scoped, derived. |
| 6.11.5 | Team leads / managers see team completion + missed | admin `teamcompletion` (TK05) + `missed` (TK06) | **Done** | **Done (verified)** | Per-team **and** per-partner assigned/completed/missed/**completion rate** as a soft-coloured `rateBar` (90+ green, 60–90 grey, <60 amber — never red short of overdue). Missed surface in TK05 + TK06. |
| 6.11.6 | Admins review overall activity + territory/team trends | admin `orgtasks` + `territorytrend` (TK08) | **Done** | **Done (verified)** | TK08 = **one** assigned-vs-completed bar chart **+** a per-territory table (completion rate + target achievement). Not a six-chart wall. |

## The gap that was closed — TK01 ClickUp feel

| Ask | Before | After |
|-----|--------|-------|
| **Draggable status change** | cards were click-to-open only | HTML5 drag between columns; only legal moves accepted (assigned ↔ in_progress ↔ complete); **`overdue` is never a manual target** (server-tick only); drop-zone highlight |
| **One-tap status** (drag fallback) | none | per-card `•••` menu offering only the legal next states |
| **Frictionless quick-add** | modal-only (`taskassign`) | inline quick-add at the top of the **Assigned** column — type a title, pick an assignee, **Enter** → task created, no modal |
| **Progress you can see / live counts** | static counts | column counts + TK05/TK08 bars re-render live over SSE when a card moves or a partner completes |
| **Card content** | title / name / due | + **avatar**, evidence-required 📎 flag retained |

New endpoint `POST /api/tasks/status` (Manager/Super, `task.create` perm) powers the move.
Guards: no manual `overdue`; evidence-required tasks can't be board-completed (409);
Finance/Legal roles refused (403). **Validated end-to-end** (quick-add → drag →
complete; + the three refusals).

## Targets — derived, never entered (verified)

- Achievement is computed from converted-lead count (the demo's chosen metric — logged OQ);
  the only editable field in `targets` (TK07) is the **target value**. No achievement input anywhere.
- Target vs achievement renders as a simple `rateBar`; **no projection, no rank-progress**.
- Period is selectable; achievement recomputes for the selected period.

## Ripples (each on the live wire)

- Assign (CRM `taskassign` or phone `tl-assign`) → partner P63 within a second (push simulated).
- Partner completes → admin `task.completed`; TK01 card moves, TK05/TK08 counts update.
- **Admin moves a card** (`task.status`) → other admin views refresh; if marked complete, the partner is notified and P63/P64 update.
- Overdue **auto-flip** on the server tick → card appears in Overdue + TK06, no party acting.
- Target updated → partner P66 recomputes.

## Done-when checklist

- [x] Maps all six clauses with the diff
- [x] TK01 feels like a PM tool — drag **and** one-tap status, inline quick-add, live counts
- [x] TK05 legible — assigned/completed/missed/rate, visualised as bars
- [x] TK08 — one chart + table of territory trends
- [x] Assign from CRM **and** from the team-lead phone, both ripple
- [x] Targets derived, shown as a bar, no input field, no projection
- [x] Overdue auto-flips without either party acting (server tick)
- [x] Partner completes with note/evidence; stats update live
- [x] Reuses the shared board/table — no new component
- [x] All 6 open questions already logged in `demo/OPEN_QUESTIONS.md` (metric, period, recurring, overdue, evidence, team-lead scope)
