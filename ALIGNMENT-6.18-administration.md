# Alignment — Administration, Roles & Audit Logs (Req 6.18)

> **Filename note:** the repo's canonical `ALIGNMENT.md` is the Req 6.5 catalogue pass. Per the established
> per-requirement convention, this 6.18 audit lives in its own file.

**Build-and-align pass.** 6.18 is the **control room** — mostly surfacing and configuring what other modules
established (Part 1 shell + Part 8 hardening). Status found by **inspecting the real code**, then the one genuine
gap was built. The audit log is the showpiece, and its completeness was proven by an explicit cross-module
audit-emission sweep (below).

Surfaces & where it lives — all in `crm-prototype/`, engine `assets/js/admin.js` (+ `admin-data.js`):
- **Audit** `S01–S03` · **Users & roles** `T01–T06` · **Configuration** `U01–U11` · **Templates** `V01–V03`.
- Almost everything here is **Super-Admin only** (`Perm.can` + `Perm.requirePermission`; pasting a forbidden URL
  lands on the denied panel and emits `ACCESS_DENIED`).

## Clause status (after this pass)

| # | Clause | State | Where it lives / what changed |
|---|--------|-------|-------------------------------|
| 6.18.1 | **Manage** users, partner approvals, roles, permissions, teams, territories, ranks, projects, inventory, programs, training, support config | **Done (verification)** | Surfaced across modules the earlier parts built: users/roles `T01–T05`; partner approvals `B02/B08/B09`; teams/territories `D01–D06`; ranks `R01–R03`; projects/inventory `E01–E09`; programs (`people.js` `PROGRAM_*`); support config `U06`. `T05` renders the **live permission matrix** (`Perm.CAN` × roles) — a fixed role set, no custom-role editor (out of scope). This clause is a **map of existing surfaces**, verified present. |
| 6.18.2 | **Configure basic statuses** (lead, booking, meeting, task, document, commission, return, ticket, settlement) | **Done ⭐ (the one build this pass)** | **New screen `U11-status-configuration`** (`SCREENS.U11` in `admin.js`; data in `admin-data.js`). The 9 status sets are the **enums the modules already use**, surfaced so a Super Admin can **relabel** the value a partner sees and **retire** a value (removed from new-record pickers). The canonical `key` the backend stores is **fixed**; **retiring never rewrites history** (records keep their state — same "nothing hard-deletes" discipline as user deactivation); **terminal states are lock-protected** (a record can always land on `converted`/`rejected`/`settled`/`closed`). Every change is confirmed + audited old→new (`EDIT_STATUS_LABEL`, `SET_STATUS_ACTIVE`). Verified in-browser: retiring *Lead · new* surfaces in `S01` as an audit entry. Wired into the `U01` config-home grid ("9 status sets · 43 values"). |
| 6.18.3 | **Suspend / reactivate** a user without deleting history | **Done (verification)** | `T04-deactivate-user` — deactivation only, **never delete**; the warning banner states audit history is preserved and stays attributable forever; requires a reason; emits `DEACTIVATE_USER` old→new. `T01` shows Active/Deactivated status and there is **no delete action anywhere**. The partner-side equivalent (`B07-suspend-reactivate`, `SUSPEND_PARTNER`/`REACTIVATE_PARTNER`) applies the same rule to partners. |
| 6.18.4 | Record important auth/admin/document/booking/commission/return/settlement actions in an **audit log** ⭐ | **Done — completeness proven** | `S01-audit-log` reads `Audit.fullLog()` (the persisted `localStorage['crm_audit']` ledger + seed, deduped, newest-first), so it surfaces **everything any module emitted**, not just this page's. Evidential styling (monospace timestamps, "you are viewing the audit log — this view is itself logged" grave-banner), filterable by actor/role/action/date + free-text search; `S02` shows the **old→new diff**; `S03` exports CSV (itself audited). **Viewing S01 is `VIEW_AUDIT_LOG`-gated (Super Admin) and is itself audited.** A cross-module emission sweep (see below) confirms **every mutating module fires `audit()` — zero gaps.** |
| 6.18.5 | **System settings**: contact, policy text, legal-doc visibility, notification templates, languages/currencies, timezone, map, construction updates, gateway, support-channel config | **Done (verification) · Partial (a few sub-panels)** | `U01` config-home groups the panels: gateways `U02` (per-country enable, **no credentials in UI**), currency/rates `U03`, booking rules `U04`, slot rules `U05`, providers/support-channel `U06`, feature flags `U07`, min-app-version `U08` (force-update ripple), session policy `U09`, invoice/legal wording `U10`, **status config `U11` (new)**, notification templates `V01–V03`, legal-doc visibility `N04` (`CHANGE_VISIBILITY`). **Honest gaps:** dedicated panels for **contact info**, **policy/legal body text**, **languages list**, and **map provider** are not yet their own screens (currency, timezone-labelling, and legal wording are covered). These are logged (OQ #8) rather than stubbed. |

## AD04 completeness proof — the acceptance test for the whole build

> *"If any module's action is missing from the log, that's a missing `audit()` to fix."*

A dedicated cross-module sweep grepped every `assets/js/*.js` emitter and every screen loader. Result: **every
domain module that mutates state emits at least one `Audit.audit()` call.** No module is silent.

| Module | Emits | Representative actions |
|---|---|---|
| People / KYC (B,C) | ✓ | `APPROVE_PARTNER`, `SUSPEND_PARTNER`, `REACTIVATE_PARTNER`, `VERIFY_KYC`, `VIEW_KYC_DOCUMENT` |
| Territory/Teams (D) | ✓ | `MOVE_PARTNER`, `CREATE_TEAM`, `ASSIGN_TEAM_LEAD`, `GENERATE_REFERRAL` |
| Catalogue (E) | ✓ | `CREATE_PROJECT`, `CHANGE_UNIT_STATUS`, `POST_CONSTRUCTION`, `CONFIGURE_CATEGORY` |
| Pipeline (F,G,H) | ✓ | `UPDATE_LEAD_STATUS`, `VERIFY_CONVERSION`, `CONFIRM_MEETING`, `CONFIRM_SITE_VISIT` |
| Finance (I,J,K) | ✓ | `CONFIRM_BOOKING`, `VERIFY_WIRE`, `TRIGGER_REMINDER`, `GENERATE_INVOICE`, `RECORD_REFUND` |
| Commission (L) | ✓ | `APPROVE_COMMISSION`, `ADJUST_COMMISSION` |
| Settlement (M) | ✓ | `APPROVE_SETTLEMENT`, `HOLD_SETTLEMENT`, `MARK_SETTLED` |
| Documents (N) | ✓ | `UPLOAD_DOCUMENT`, `CHANGE_VISIBILITY`, `ARCHIVE_DOCUMENT` |
| Support (O) | ✓ | `ASSIGN_TICKET`, `UPDATE_TICKET_STATUS`, `CLOSE_TICKET`, `REPLY_TICKET` |
| Notices (P) | ✓ | `PUBLISH_NOTICE`, `SAVE_NOTICE_DRAFT` |
| Reports (Q) | ✓ | `EXPORT_REPORT` |
| Ranks (R) | ✓ | `ASSIGN_RANK` |
| Admin/Users (T) | ✓ | `CREATE_STAFF_USER`, `ASSIGN_ROLE`, `DEACTIVATE_USER` |
| Config (U) — incl. **new U11** | ✓ | `SET_GATEWAY_STATUS`, `SET_MIN_APP_VERSION`, `SET_FEATURE_FLAG`, **`EDIT_STATUS_LABEL`, `SET_STATUS_ACTIVE`** |
| Templates (V) | ✓ | `EDIT_NOTIF_TEMPLATE`, `TEST_NOTIF_TEMPLATE` |
| Investment (6.6) | ✓ | `RECORD_RETURN_ENTRY`, `SET_RETURN_ENTRY_STATUS` |
| Auth shell | ✓ | `SIGN_IN`, `SIGN_OUT`, `ACCESS_DENIED` |

**Non-blocking observations from the sweep** (logged, not gaps):
- **Impersonation (`T06`) is view-only / disabled** — there is no `IMPERSONATE` emitter because the mechanism is
  designed but switched off. If ever enabled, every impersonated action must be **double-audited** (Part 8 OQ #3).
- **No canonical action vocabulary** — action strings are free-form literals (two even built dynamically:
  `ASSIGN_<KIND>`, `PROGRAM_<ACTION>`), and the seed uses verbs (`PUBLISH_PROJECT`, `PUBLISH_DOC`,
  `RELEASE_SETTLEMENT`) that don't exactly match live emitters (`EDIT_PROJECT`, `UPLOAD_DOCUMENT`, `MARK_SETTLED`).
  A central `AUDIT_ACTIONS` constant before the Laravel port would make filtering/reporting reliable (OQ #7).

## Key rules — verified

- **Nothing hard-deletes.** Users deactivate (`T04`), partners suspend (`B07`), documents archive (`N02`),
  statuses retire (`U11`) — all reversible, all audited, all history-preserving. There is no delete action.
- **The audit log surfaces everything** (proven above). The new `U11` was the live test: its `SET_STATUS_ACTIVE`
  appeared in `S01` immediately.
- **System settings drive config** — gateways, currencies, min-app-version, session, providers, statuses — the
  values other modules read. Gateway **credentials never appear in the UI** (secrets manager, not the panel).
- **Permissions are almost all Super-Admin only**, enforced by `Perm.requirePermission` on every mutation.

## What was deliberately NOT built

- **No hard-delete** anywhere.
- **No custom permission/role editor** — fixed role set (`Super Admin`, `Manager`, `Finance`, `Legal`).
- **No real secrets/credentials in the UI** — gateway keys live in a secrets manager.
- **No new components** — `U11` reused the U-config screen pattern (confirm dialog + `audit()` + `auditNote`).

## Done-when checklist (6.18)

- [x] This table maps all **five** clauses of 6.18 with the diff
- [x] Users/roles management (`T01–T05`, live permission matrix)
- [x] **Suspend/reactivate retaining history** (`T04`/`B07`, never delete)
- [x] **Status configuration** built (`U11`, 9 sets, relabel + retire, terminal-locked, audited) ⭐
- [x] **Audit log surfacing every module's actions** — evidential styling, Super-Admin only, self-audited;
  completeness proven by cross-module sweep (**no missing `audit()` calls**)
- [x] Full **system-settings** config set surfaced (`U01–U11` + `V*`); contact/policy-text/languages/map
  sub-panels logged as follow-ups (OQ #8)
- [x] Open questions logged in `crm-prototype/OPEN_QUESTIONS.md`

---
_Logged during the Req 6.18 Administration alignment pass. `U11` is the only new screen; everything else was
verified against Part 1 + Part 8. Every `[~]`/partial is a surfaced, logged gap._
