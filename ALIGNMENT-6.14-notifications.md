# Alignment — Notifications & Official Notice Board (Req 6.14)

> **Filename note:** the repo's canonical `ALIGNMENT.md` is the Req 6.5 catalogue pass. Following the
> established per-requirement convention (`ALIGNMENT-6.1`, `-6.4`, `-6.6`, `-6.7`), this 6.14 audit lives
> in its own file rather than clobbering a peer's in-progress `ALIGNMENT.md`.

**Reconcile-and-align pass.** 6.14 is mostly **wiring already in place** — every module fires a ripple to a
phone, and Part 8 built the notification-template layer. Status found by **inspecting the real code** across
three surfaces, then verified. The one build this pass touched is on the 6.18 side (status configuration);
6.14 was found substantially complete and is documented honestly below, gaps included.

## The three surfaces

| Surface | Path | What it is |
|---|---|---|
| **Admin — compose & templates** | `crm-prototype/screens/P01–P03` (`connect.js`), `V01–V03` (`admin.js`) | Notice authoring with reach preview; per-type push templates that block sensitive vars. |
| **Client mobile** | `app/client/notification-centre.page.html` | Grouped, timezone-correct, bilingual notification history. No financial detail in payloads. |
| **Partner mobile** | `app/partner/notifications.page.html` + `app/shared/notices.page.html` | Partner notification centre + the **notice board** (only shows notices targeted to that partner). |

## Clause status (after this pass)

| # | Clause | State | Where it lives / what proves it |
|---|--------|-------|-------------------------------|
| 6.14.1 | Notifications for the **14 event types** (partner approval, inventory, lead status, booking, meeting confirmation, task assignment, document publication, commission approval, return-record update, support-ticket status, settlement status, client payment status, installment due/overdue, construction-progress) | **Done (emit) · Partial (templates)** | Every event **emits** at its module (see the emit-point map below — the audit-coverage sweep confirms all mutating modules fire). Both mobile centres **surface** them grouped by family (client: installments · payments · consultations · projects · support · account; partner: approval · lead · task · commission · settlement · meeting). **Dedicated push templates exist for 6** of the 14 (`admin-data.js` — partner-approved, partner-rejected, KYC-verified, booking-confirmed, commission-approved, installment-due). The other 8 ripple with generic copy — **expanding the template set to all 14 is a logged follow-up (OQ #4)**, not claimed as done. |
| 6.14.2 | Admins publish **official notices** to all partners, or filtered by **team / territory / rank / program**, with a **reach preview** ⭐ | **Done** | `P02-compose-notice` (`connect.js:490`). Four targeting selects (territory/team/rank/program); `computeAudience()` filters the real partner roster and renders the **blast-radius panel** — "128 · All partners" or "N · Team Cumilla Sadar Alpha" — **before** send. Publishing is `PUBLISH_NOTICE`-gated (Super Admin), emits `audit()` + a Notice-board ripple. Verified in-browser: changing targets updates the count live. |
| 6.14.3 | Store notification + notice **history** in the mobile app | **Done** | Client & partner notification centres render a persistent, scrollable, grouped **history** (not a transient toast); each entry deep-links. The notice board (`app/shared/notices.page.html`) shows the partner's targeted notices. History survives navigation (it is the app's own store, mirrored to the backend at merge time). |
| 6.14.4 | **SMS / WhatsApp / email automation OUT of base scope** unless separately confirmed | **Done (honoured)** | No SMS/email/WhatsApp **notification** sender exists anywhere. All templates are `type:'Push'`; delivery is **in-app + push only**. The one WhatsApp reference is `U06`/`O03` **support-chat handoff** (a human replying to a ticket), explicitly *undecided* (OQ) — not notification automation. Nothing in this module sends to an external channel. |

### Client's ask — "notifications follow role criteria + universal role"

Honoured by design. Targeting (6.14.2) is the **role/segment criteria** path — a notice reaches only partners
matching team/territory/rank/program. The **"All partners"** default (empty targeting → `computeAudience` returns
the full non-rejected roster) is the **universal role** path. Both are the same compose flow; the reach preview
names which one you're in ("All partners" vs a filtered label) before you send.

## Emit-point map — the 14 event types → where each fires

| Event type | Emitter (module · action) | Mobile group |
|---|---|---|
| Partner approval | `people.js` · `APPROVE_PARTNER` (B09) + `TPL-approve-partner` | partner · approval |
| Inventory updates | `catalogue.js` · `CHANGE_UNIT_STATUS` (E03) | client · projects |
| Lead status | `pipeline.js` · `UPDATE_LEAD_STATUS` (F03) | partner · lead |
| Booking | `finance.js` · `CONFIRM_BOOKING` (I02/J02) + `TPL-booking-confirmed` | client · payments |
| Meeting confirmation | `pipeline.js` · `CONFIRM_MEETING` (G02) | partner/client · consultations |
| Task assignment | partner centre `task` group (`partner-system.js`) | partner · task |
| Document publication | `connect.js` · `UPLOAD_DOCUMENT` (N03) | (partner/client, as targeted) |
| Commission approval | `commission.js` · `APPROVE_COMMISSION` (L02) + `TPL-commission-approved` | partner · commission |
| Return-record update | `invest.js` · `SET_RETURN_ENTRY_STATUS` | partner (amber-locked, record-only) |
| Support-ticket status | `connect.js` · `UPDATE_TICKET_STATUS` (O01) | client · support |
| Settlement status | `commission.js` · `MARK_SETTLED` (M) | partner · settlement |
| Client payment status | `finance.js` · payment result (I/J) | client · payments |
| Installment due/overdue | `finance.js` · `TRIGGER_REMINDER` (K03) + `TPL-installment-due` | client · installments |
| Construction-progress | `catalogue.js` · `POST_CONSTRUCTION` (E05) | client · projects |

## Key rules — verified

- **Timezone-correct.** Both centres format every timestamp with `Intl.DateTimeFormat({ timeZone })` against the
  viewer's zone (`Asia/Dhaka` etc.) and print the zone label — a 9am reminder reads 9am for that user.
- **No financial detail in payloads (deep-link, don't disclose).** Both centres carry an explicit "no balance,
  amount or reference — deep link only" note, and the **template editor blocks sensitive variables** on save
  (`AD.sensitiveVarsIn` → `{amount}`, `{balance}`, `{commission}`, `{reference}`, … cannot be saved into a push).
  A locked phone shows *"you have a commission update"*, never the figure.
- **Targeting has a reach preview before send** (the ⭐ standout) — the sender always sees who they're reaching first.
- **History stored on the app** (clause 3) — grouped, persistent, bilingual (EN/বাংলা).

## What was deliberately NOT built

- **No SMS/email/WhatsApp automation** (clause 4).
- **No financial detail in any notification payload.**
- **No new components** — reused the P-series compose flow, the V-series template editor, and the existing
  mobile notification-centre shell. AD03 (status config, the 6.18 build) reused the U-config pattern.

## Done-when checklist (6.14)

- [x] This table maps all **four** clauses of 6.14 with the diff
- [x] Notification centre + notice board with **history**, **timezone-correct**, **no financial detail** in payloads
- [x] **Targeting with a reach preview** (P02, verified live)
- [x] **No SMS/email/WhatsApp automation** (honoured — push + in-app only)
- [~] Dedicated push **templates for all 14 event types** — 6 seeded; the other 8 emit via module ripples with
  generic copy. Expanding to all 14 is logged (OQ #4), not claimed as done.
- [x] Open questions logged in `crm-prototype/OPEN_QUESTIONS.md`

---
_Logged during the Req 6.14 Notifications alignment pass. Every `[~]` is an intentional, surfaced gap._
