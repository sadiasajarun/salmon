# Alignment — Meetings, Coordination & Visit Booking (Req 6.9)

Verify-connect-polish pass over three prototype surfaces. Status found by **inspecting the real
code**, then closing the spine gaps. This pass was scoped to the **static prototypes** (CRM
`crm-prototype/*` + partner `app/partner/*` + their JS) and this doc; the **connected demo**
(`demo/`) was being actively worked by a parallel pass and was deliberately left untouched to avoid
clobbering it — its clauses are marked _connected-pass_ below. Siblings: [`ALIGNMENT.md`](ALIGNMENT.md),
[`ALIGNMENT-6.10-booking-payment-records.md`](ALIGNMENT-6.10-booking-payment-records.md).

## The three surfaces

| Surface | Path | What it is |
|---|---|---|
| **Partner mobile** | `app/partner/{request-meeting,request-visit,meeting-confirmed,awaiting-slot,calendar}.page.html` + `app/assets/js/{partner-ops,timezone,project-selector}.js` | Static prototype — request flows + calendar. |
| **Admin CRM** | `crm-prototype/screens/G01–G04, H01–H03` + `assets/js/{pipeline,pipeline-data}.js` | Static scheduler/queue desk. |
| **Live demo** | `demo/server.js` + `demo/public/{partner,admin}/app.js` | Connected SPA — _owned by the parallel pass this cycle._ |

Because these are separate prototypes (they merge at the Laravel + React build), the scheduling
model is **mirrored**, not shared — flagged where it matters.

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.9.1 | Request virtual meetings with manager/scheduler/sales/customer-care/accounts | `request-meeting` (`partner-ops.meetingWith`) | **Done (partner)** | **Done (partner)** | Partner already offers all five staff types. CRM assigns internal staff at confirm; demo's 3-type list is a _connected-pass_ drift (logged). |
| 6.9.2 | Request project/site visit linked to a project or lead (shared selector) | `request-visit` + `project-selector.js`; CRM G03 | **Done (partner)** | **Done** | Partner reuses the **shared `ProjectSelector`** (`mode:'project'`, required) + optional lead link. CRM G03 carries `project`+`leadId`. No parallel selector built. |
| 6.9.3 | Schedulers create slots, **confirm / reschedule / cancel** | CRM `pipeline.js` | **Partial** — confirm (meeting/visit/consultation) + slot-add existed; **reschedule only for consultations, no cancel anywhere** | **Done (CRM)** ⭐ | Added `rescheduleMeeting/cancelMeeting/rescheduleVisit/cancelVisit` — each gated `MANAGE_MEETING`, **reason mandatory on cancel**, status-transition kept (never deleted), rippled to the partner. Wired into G01/G03 queues. Slot rules (U05) vs slot instances (H01) still two subsystems (logged). |
| 6.9.4 | Attach external meeting **link** (virtual) or physical **location** (visit) | CRM confirm dialogs; `meeting-confirmed` | **Partial** — meeting link required at confirm; **visit location was seed-only, not enterable** | **Done (CRM)** | `confirmVisit` now takes a required **physical location** field (map-pin framing) and stamps it on the visit + ripple. Partner meeting-confirmed shows the external link with explicit "app hosts no video". |
| 6.9.5 | Recurring coordination incl. twice-monthly head-office, with **attendance** | new CRM **G04**; `partner-ops`/`calendar` | **Drifted** — one hardcoded partner row with a single free-string `attendance:'confirmed'`; **CRM had nothing** | **Done** ⭐⭐ | New **`coordinationSeries` + occurrences** with a real **attendance enum (attended/absent/excused/pending)** and a roster. New CRM screen **G04** renders the standing fixture, per-occurrence rosters, and lets staff mark attendance (audited). Partner `calendar` upgraded to the enum + attendance history. Cadence/absence consequences logged (OQ #3). |
| 6.9.6 | Booking confirmation + reminder notifications | CRM ripples; partner confirmed pages | **Partial** | **Partial (honest)** | Confirmation ripples fire to the partner on confirm/reschedule/cancel. **Real reminder scheduling is not built** on any static surface (the only working reminder pipeline is finance installment reminders); partner reminder is a stub. Provider + reminder timing logged (OQ #1). |
| 6.9.7 | Record **outcome + follow-up** notes in CRM (staff full, partner simplified) | CRM lead timeline; consultation prep | **Partial** | **Partial (documented)** | Outcomes are captured today as **internal lead-timeline notes** (`internal:true`) + consultation `prep`; there is no dedicated meeting-outcome model. Left as-is this pass (not a spine); logged as the main remaining 6.9 gap. |

## Timezone-honest slots (the standout)

- `app/assets/js/timezone.js` (`TZ.build()`) already produces **dual-timezone** slots — each carries
  `clientLabel` **and** `dhakaLabel`, with a waking-hours honesty note. It is wired into the **client**
  consultation-slots screen. For a Dhaka-based **partner**, partner-time and office-time coincide, so the
  partner meeting pages render Dhaka time labelled "Your time (Dhaka)"; the dual-display engine is present
  and reused for the client. Extending explicit dual-display to overseas partners is a small follow-up
  (the engine already supports it) — logged.

## Cross-surface notes (honest)

- **Attendance enum is mirrored** — CRM `pipeline-data.ATTENDANCE` and the partner `attendanceHistory`
  encode the same `attended/absent/excused/pending` set in two files (separate prototypes). One
  server-owned series is a merge-time task.
- **G04 is reachable directly and from a link on G01** (the meetings queue) — consistent with how the
  other G-screens are navigated (no central screen index in `crm-prototype`).
- **Connected demo left untouched** this pass by design (parallel worker). Its 6.9 gaps mapped but not
  changed: no `siteVisits` collection, wrong meeting-with list, auto-generated (not entered) links, no
  slot/reschedule/cancel endpoints, no attendance model. These belong to the connected pass.

## Done-when checklist (this pass's scope)

- [x] Clauses mapped across all three surfaces with the diff
- [x] Calendly-style slot mechanism present (CRM H01 slot-add; partner requests, doesn't self-book)
- [x] Request → confirm → link (virtual) / **location** (visit) — location now enterable at confirm
- [x] **Reschedule + cancel** for meetings & visits, gated + audited + history (reason on cancel)
- [x] **Recurring head-office fixture with attendance enum** — new CRM G04 + partner calendar
- [x] Reuses the shared `ProjectSelector`; no parallel selector
- [~] Timezone-honest (dual-time engine present + client-wired; partner dual-display for overseas partners logged)
- [~] Outcome/follow-up (approximated via internal lead timeline; dedicated model logged)
- [ ] Live ripple to mobile — _connected-pass; not in this pass's scope_
- [x] Open questions logged

_Every "After = Done" is backed by a real code change in the listed static file. Connected-demo items
are intentionally out of scope this pass to avoid colliding with the parallel worker on untracked files._
