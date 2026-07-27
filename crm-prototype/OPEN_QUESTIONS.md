# CRM / Admin Panel — Open Questions (Part 1)

> Undefined by the client. Guessing any of these is a defect — the prototype uses clearly-marked
> placeholders and logs the gap here. Resolve with Salmon before the Laravel build.

1. 🔴 **SSO / MFA choice** — what does Salmon use for staff auth today? (Google Workspace SSO? Email+password
   + TOTP? SMS OTP?) The A01 login shows a generic MFA code step as a placeholder.
2. 🔴 **Session policy** — idle timeout, max concurrent sessions per staff member, IP allow-listing? A02
   (session expired) assumes a timeout exists but no duration is defined.
3. 🔴 **Role granularity** — is **Manager** one role, or do **Scheduler** and **Support Officer** split off
   later? Part 1 merges them per the proposal; the permission map is structured so a split is additive.
4. 🔴 **Team Lead visibility** — the proposal mentions team leads seeing "only assigned teams/territories."
   Is this a *panel* role (unlikely — they're partners) or a *scoping* concept applied to Manager? Assumed
   the latter (a scope filter on Manager), not a panel role.
5. 🔴 **Territory hierarchy in the panel** — Division › District › Upazila › Union. How deep does staff
   scoping go? (Whole division? District only?) Filters expose all four levels as a placeholder.
6. 🔴 **CSV export** — which summaries are "non-sensitive" and exportable, which are restricted? A05 exposes
   an export button on summary tiles only; row-level financial/PII export is disabled pending this answer.
7. 🔴 **Audit-log retention & export** — how long are entries kept, and who may export them? `VIEW_AUDIT_LOG`
   is Super-Admin-only for now; export is not offered until retention policy is set.
8. 🔴 **Panel language** — English-only for staff, or Bengali too? Part 1 is **English-only** (staff console);
   the mobile app stays bilingual. Confirm before adding i18n plumbing.
9. 🔴 **Notification email fallback** — do staff also get email for critical events (settlement queue growing,
   KYC backlog), or panel-only? A10 is panel-only for now.
10. 🔴 **Global search scope** — index across everything a staff member can access, or restricted subsets?
    ⌘K currently searches partners/clients/projects/units/leads/tickets within the signed-in role's access.

---
_Logged during CRM Part 1 (shell + dashboards). Every item is an intentional gap._

# CRM / Admin Panel — Open Questions (Part 2 · People & Access)

> Undefined by the client for the People & Access module. Each is placeholdered in the
> prototype and surfaced in-screen (a note, an effect summary, or a "log the question"
> radio option) rather than guessed. Numbering restarts for this module.

1. 🔴 **Partner ID format** — the prototype mints `SDP-<TERRITORY>-<5 digit seq>` (e.g.
   `SDP-CUM-00417` for Shahin, to match the Part-1 references). Is the `SDP-` stem correct?
   What are the territory-prefix rules (by district? upazila? office?) and is the sequence
   global or per-territory? Shown before confirmation on the B09 approve dialog.
2. 🔴 **Approval SLA** — the queue-age colouring (amber → red) assumes a **2-business-day**
   target. Confirm the real SLA and whether it's business days or calendar days.
3. 🔴 **Bulk-approve rate limit** — capped at **20 partners per action** as a placeholder.
   What is the real maximum per bulk action? (B10 warns and truncates above the cap.)
4. 🔴 **Partner rejection reason set** — currently **free text** (write-once, shown verbatim
   on mobile P08). Should it be a fixed dropdown, free text, or both?
5. 🔴 **KYC rejection reason set** — the prototype uses a fixed list (Document expired · Name
   mismatch · Unreadable · Wrong document · Suspected tampering · Other) **+ free-text note**.
   Confirm the canonical list.
6. 🔴 **In-flight leads on partner move** — when a partner changes team/territory, what happens
   to leads currently assigned to them: reassign to the new team lead, keep with the partner,
   or split by state? The D06 move dialog **forces a choice and can log it undecided** — no
   default is assumed.
7. 🔴 **Suspension scope** — does suspension block partner-side app access **entirely** (P09
   shell) or only **new-lead submission**? The B07 dialog exposes both as an explicit choice.
8. 🔴 **Rank-change effects** — beyond sales-kit content gating, does a rank change also change
   **commission rate**? Current scope says no automation (ranks are manual, note-required); the
   question is logged on R01. No "criteria met" auto-suggestion is shown anywhere.
9. 🔴 **Client suspension** — does a "suspend client" concept exist at all, or is KYC state the
   only client-side intervention? Part 2 assumes **no client suspension** (only KYC + support).
10. 🔴 **Territory hierarchy** — is **Division › District › Upazila › Union** the final depth?
    The D01 tree is built to exactly four levels; confirm before the Laravel schema.
11. 🔴 **Referral-code lifetime** — do codes **expire** or are they **permanent** until manually
    deactivated? Treated as permanent-until-deactivated in D07.
12. 🔴 **Team-lead demotion** — when a team lead's flag is removed, what happens to their team's
    roster and reports — reassign, orphan, or hold? The D05 flag flip currently leaves the roster
    untouched and logs the question.

---
_Logged during CRM Part 2 (People & Access). Every item is an intentional gap, surfaced in-screen._

# CRM / Admin Panel — Open Questions (Part 3 · Catalogue & Inventory)

> Undefined by the client for the Catalogue module. Placeholdered in-screen rather than guessed.
> Numbering restarts for this module.

1. 🔴 **Publishing ownership** — is publishing/unpublishing a project **admin-only**, or can Managers
   publish too? Part 3 gates `PUBLISH_PROJECT` to **Super Admin only** (E07 shows A03 to a Manager);
   `MANAGE_INVENTORY`, `UPLOAD_MEDIA`, `POST_CONSTRUCTION` are shared with Managers.
2. 🔴 **Unit inventory statuses** — beyond **Available / Reserved / Booked / Sold**, are there
   Salmon-specific states (e.g. *Blocked*, *Hold*, *Litigation*)? Only the four are modelled.
3. 🔴 **Media types & size limits** — accepted formats and max file sizes per type (photo/video/360/
   floor-plan/brochure)? The prototype accepts a label + type (360 = equirectangular/Matterport URL only);
   no editing, cropping or size enforcement.
4. 🔴 **Construction-update push scope** — does a new update push to **all** clients, or only those with a
   **booking / favourite** on that project? The E05 confirm dialog says "push to interested clients" and
   logs the question; the ripple assumes interested-clients-only as a placeholder.
5. 🔴 **Price-change history** — is a unit price change **audit-worthy** with retained history? Every price
   edit currently emits `audit()` with old→new + a reason note, but whether a dedicated price-history
   ledger is required is unconfirmed (surfaced on E08).

---
_Logged during CRM Part 3 (Catalogue & Inventory). Every item is an intentional gap, surfaced in-screen._

# CRM / Admin Panel — Open Questions (Part 4 · Sales Pipeline)

> Undefined by the client for the Sales Pipeline module. Placeholdered in-screen. Numbering restarts.

1. 🔴 **Full internal lead status list** — richer than the 6 the partner sees. The prototype models
   New · Contacted · Qualified · Meeting scheduled · Site visit scheduled · Visit completed · In
   negotiation · Converted · On hold · Closed/rejected, projected down to the partner's 6. Confirm the
   canonical internal set.
2. 🔴 **Who may verify a conversion** — Manager alone, or Manager + Super-Admin confirmation? Currently
   `VERIFY_CONVERSION` = Super Admin **or** Manager (single-step).
3. 🔴 **What event creates the commission record** — booking record confirmed, first payment received, or
   lead marked Converted alone? The prototype creates the Pending record on **Verify conversion (F04)**;
   this is a genuine Finance × Sales business rule to settle (the amount is still Finance's, in Part 6).
4. 🔴 **Consultation slot rules** — duration, buffer between slots, booking horizon, cancellation window?
   Slots are free-form in H01 with no rules enforced.
5. 🔴 **Meeting link** — auto-generated per meeting, or pasted in? The prototype **pastes** an external
   Zoom/Meet/Teams link on confirm (no in-panel call).
6. 🔴 **Lead deduplication** — if the same phone number is submitted by two partners, who gets credit?
   No dedup logic is built (explicitly out of scope); logged here.
7. 🔴 **Site-visit attendance capture** — do visits need photo/timestamp proof of attendance, or just a
   status update? The prototype treats a visit as a status update only.

---
_Logged during CRM Part 4 (Sales Pipeline). Every item is an intentional gap, surfaced in-screen._

# CRM / Admin Panel — Open Questions (Part 5 · Finance Core)

> Undefined by the client for the Finance Core module. Placeholdered in-screen. Numbering restarts.
> Items 3, 6 and 8 are **business rules that must come from Salmon's finance team**, not a developer.

1. 🔴 **Gateways & countries** — which payment gateways go live, in which countries? The prototype
   models SSLCommerz (BDT) + a Stripe-style callback; the match rules are gateway-agnostic.
2. 🔴 **Signed webhook fields per gateway** — the exact fields and signature scheme to match on. The
   prototype checks signature + reference + amount + currency.
3. 🔴 **Unit-lock expiry while payment pending** — what happens when a unit lock expires but the payment
   is still pending? A real business answer is needed, not an engineering guess. Surfaced on I02/K02.
4. 🔴 **Wire verification SLA** — the number the J01 age indicator warns against (defaulted to 3 days).
5. 🔴 **Webhook-mismatch override** — is an override on a mismatch ever permitted, and by whom? The
   prototype has **no override toggle** — a mismatch disables confirmation with the specific reason.
6. 🔴 **Refund policy** — full / partial / non-refundable, configurable per project? K06 only **records**
   the decision; execution happens outside the panel.
7. 🔴 **Invoice numbering / tax / legal wording** — exact format, tax fields, and Salmon-approved legal
   footer. K05 uses config-driven placeholders (`INV-2026-####`, VAT label, placeholder legal text).
8. 🔴 **Installment schedule rules** — count, intervals, and late-payment penalties. K02 shows a sample
   schedule with no rules enforced.
9. 🔴 **Reminder cadence & timezone rules** — how far ahead, how often for overdue, timezone handling.
   K03 sends a single timezone-adjusted push with no cadence engine.

---
_Logged during CRM Part 5 (Finance Core). Every item is an intentional gap, surfaced in-screen._

# CRM / Admin Panel — Open Questions (Part 6 · Commission & Settlement)

> Undefined by the client for the partner payout desk. Placeholdered in-screen. Numbering restarts.
> Items 1, 6 and 8 are **business rules Salmon must define**.

1. 🔴 **Commission trigger** — when Sales verifies a conversion (Part 4), is the record created
   immediately, or only after the client's first payment lands (Part 5)? Depends on Part-5 Q3.
2. 🔴 **With-Investment higher-tier rate** — the number. Not modelled — amounts are hand-entered.
3. 🔴 **Zero-Investment rate** — fixed, project-specific, or per-deal? Not modelled — hand-entered.
4. 🔴 **Minimum settlement amount** — the floor a partner must reach to request payout. Not enforced.
5. 🔴 **Settlement hold rules** — what triggers a hold and who releases it? M02 hold is manual + reason.
6. 🔴 **Commission reversal / clawback** — what if a client refunds or defaults after commission was
   settled? L04 supports reduce/reverse but the policy is undefined.
7. 🔴 **Adjustment authority** — does adjusting an approved commission require Super Admin, or can Finance
   alone? Currently `ADJUST_COMMISSION` = Super Admin **or** Finance.
8. 🔴 **M03 channel categories** — the confirmed list. Prototype uses Cash / Bank / bKash / Nagad / Cheque
   / Other.
9. 🔴 **Settlement reference** — auto-generated (e.g. `STL-2026-0091`) or entered by Finance? M03 accepts a
   typed non-sensitive reference and falls back to an auto id if left blank.

**Rules held firm (not questions):** the panel never pays; no bank field exists anywhere; commission
amounts are entered by hand with no rate table or calculator.

---
_Logged during CRM Part 6 (Commission & Settlement). Every item is an intentional gap, surfaced in-screen._

# CRM / Admin Panel — Open Questions (Part 7 · Documents, Communications, Reporting)

> Undefined by the client for the connective-tissue modules. Placeholdered in-screen. Numbering restarts.
> Item 1 needs the client; item 6 is the same product decision blocking mobile screen 58.

1. 🔴 **Which reports are non-sensitive / CSV-exportable?** The mechanism exists (an `exportable` flag per
   report gating the Export button); the classification is Salmon's to make. Q01/Q02 surface it.
2. 🔴 **Document categories** — the confirmed list, and which are always Internal. Prototype uses
   Legal / Plan / NOC / Brochure / KYC / Sales record.
3. 🔴 **Version retention** — keep all document versions forever, or purge after N? Surfaced on N05.
4. 🔴 **Access-log retention** — days, months, forever? Surfaced on N06.
5. 🔴 **Ticket SLA targets per category** — prototype defaults: Sales 8h · Accounts 12h · Customer Care 6h
   · Admin 24h (drives the O01 age colouring).
6. 🔴 **Chat provider** — WhatsApp Business API or in-app provider console? Blocks O03 (and mobile
   screen 58). O03 is a placeholder with both options.
7. 🔴 **Notice targeting attributes** — team + territory + rank + program is the confirmed set; anything
   else? P02 exposes exactly those four.
8. 🔴 **Notice scheduling** — send now, schedule for later, or both? P02 offers both as a placeholder.
9. 🔴 **Report scoping for team leads** — the proposal says they see only their team/territory. The exact
   rule is undefined; `VIEW_REPORT` is role-gated but not yet team-scoped.

---
_Logged during CRM Part 7 (Documents, Communications, Reporting). This completes the panel; every gap is intentional._

# CRM / Admin Panel — Open Questions (Part 8 · Hardening)

> Undefined by the client for the hardening screens. Placeholdered in-screen. Numbering restarts.
> Items 4 and 7 are legal/operational decisions, not engineering.

1. 🔴 **SSO / MFA provider** — Salmon's staff-auth setup (Google Workspace SSO? TOTP? SMS OTP?). No
   password fields exist in the panel; auth is provisioned externally. Surfaced on T02/U09.
2. 🔴 **Session policy** — idle timeout, max concurrent sessions, IP restrictions. U09 shows editable
   defaults (30 min · 2 sessions · MFA required, method TBD).
3. 🔴 **Impersonation** — may Super Admin "view as" another user for support? If yes, T06 is required and
   every impersonated action is **double-audited**. Disabled in the prototype.
4. 🔴 **Audit-log retention** — how long must it legally be kept (Bangladeshi finance/property compliance)?
   Surfaced on S01. The ledger is now persisted; retention/purge is unset.
5. 🔴 **Audit-log export scope** — Super-Admin-only in the prototype (S03). Is that final?
6. 🔴 **Compliance / Legal read-only role** — should a role exist with audit-log read access but no mutate
   rights? Currently `VIEW_AUDIT_LOG` = Super Admin only.
7. 🔴 **Two-person approval** — which config changes need dual sign-off (e.g. raising the minimum app
   version, disabling all gateways)? Not modelled; single-Super-Admin confirm today.
8. 🔴 **Notification-template approval workflow** — can Super Admin publish template edits directly, or is
   a review step required? V02 saves directly today.
9. 🔴 **Exchange-rate source** — automatic feed or manual entry? U03 uses manual entry as a placeholder.
10. 🔴 **Invoice template scope** — one global template, or per-project overrides? U10 is one global.

---
_Logged during CRM Part 8 (Hardening). This completes the panel — every staff role, every audit-worthy
action, every gated configuration. The remaining gap is the amber-locked **With-Investment** module,
awaiting Salmon's legal counsel (commercial rules, return schedule, disclaimer copy)._

# Catalogue Alignment — Open Questions (Req 6.5 · Project, Inventory & Media)

> Raised during the Req 6.5 reconcile-and-align pass (configurable categories, publish lifecycle,
> inventory live-sync, media gallery, shared selector). Placeholdered in-code, never guessed.
> **Questions 1, 3, 4 and 10 need Salmon** before the Laravel build. Extends Part 3 above.

1. 🔴 **Field-per-category matrix** — the default matrix (apartment → bedrooms/bath/area/floor/balcony/
   facing/price; commercial & shop → area/floor/frontage/price; land share → plot size/share fraction/
   price; hospital-hotel share → share fraction/area/return-frame/price) is a **sensible default, not
   confirmed**. Confirm which config fields apply per category. Shown on E09 with a "placeholder" note.
2. 🔴 **Who configures categories** — can Salmon add categories/fields **themselves** in production, or
   is it **dev-configured**? The prototype lets Super Admin add a category + toggle fields (E09), persisted
   locally. The schema currently lives in **two mirrored files** (`catalogue-categories.js` admin +
   `salmon-categories.js` client) because the prototypes are separate; unify to one server-owned table at
   merge time.
3. 🔴 **Land / plot share representation** — how are shares modelled: **fractions** (1/4, 1/2), **katha/
   decimal**, or **named lots**? The prototype uses a placeholder unit shape (`plotSize` katha + `shareFraction`
   %); the `PRJ-LND` demo project is flagged `[CLIENT COPY REQUIRED]`.
4. 🔴 **Hospital / hotel share returns** — what may be **shown**, given the legal sensitivity? The
   category declares an `expected-return frame` field, but every return value renders
   `[AMOUNT — LEGAL SIGN-OFF REQUIRED]` — **no rate, projection, or guarantee**. Same discipline as
   With-Investment (Req 6.6). Needs Salmon + legal counsel.
5. 🔴 **Inventory states beyond the four** — beyond **Available / Reserved / Booked / Sold**, any Salmon-
   specific states (e.g. *On hold*, *Blocked*, *Litigation*)? Only the four are modelled (mirrors Part 3 #2).
6. 🔴 **Publish / unpublish authority** — is publishing **admin-only** or may **managers** publish too?
   `PUBLISH_PROJECT` and `CONFIGURE_CATEGORIES` are **Super-Admin-only**; `MANAGE_INVENTORY`, `UPLOAD_MEDIA`,
   `POST_CONSTRUCTION` are shared with Managers (mirrors Part 3 #1).
7. 🔴 **Media approval** — single-step **publish**, or a **review workflow**? Media currently goes live on
   upload; there is no per-media draft/approved state. Confirm whether a review gate is required.
8. 🔴 **Construction-progress push scope** — does a new dated update push to **all clients**, or only those
   with a **booking / favourite** on that project? E05 assumes interested-clients-only as a placeholder
   (mirrors Part 3 #4).
9. 🔴 **Price-change history** — is a unit price change **audit-tracked** with a retained history ledger?
   Every price edit emits an audit entry with old→new; a dedicated price-history ledger is unconfirmed
   (mirrors Part 3 #5).
10. 🔴 **Real assets Salmon must supply** — verified **project coordinates**, confirmed **pricing**, real
    **360 / Matterport** equirectangular assets, real **floor-plan / layout** files, and the **AED reference
    rate**. All currently carry visible `[…placeholder]` / `[CLIENT COPY REQUIRED]` markers; the 360 viewer
    is a Pannellum-ready seam awaiting client-supplied panoramas.

---
_Logged during the Req 6.5 Catalogue Alignment pass. Every item is an intentional gap, surfaced in-screen.
See `ALIGNMENT.md` (repo root) for the clause-by-clause diff._

---

## Commission Settlement Request & Status (Req 6.13)

The module is built and disciplined across all three surfaces (partner one-input
request → finance `M0x` desk → mark-settled). The **no-bank-field** rule is
grep-proven by `.claude/gates/settlement-no-bank-field-guard.sh`. See
`ALIGNMENT-6.13-settlement.md`. Open product decisions:

1. **Minimum settlement amount?** *Demo: none beyond `> 0`.* Confirm a floor and
   whether partial settlements are allowed.
2. 🔴 **Hold rules** — what triggers a hold, and who releases it? *Demo: finance
   holds with a reason; any finance/super-admin resumes via M02.* Trigger policy undefined.
3. **Channel categories** — is `Cash / Bank / bKash / Nagad / Cheque / Other` the
   confirmed list? (shared with Part 6.)
4. **Partner-facing reference** — auto-generated or entered by finance? *Demo: auto
   (`ST-2026-###`), overridable with a non-sensitive ref on M03.*

## Training & Sales Kit content management (Req 6.15)

The partner library (TR01–TR04, TR06) was already complete; the **admin content
desk (Y01)** was the gap and is now built — upload / publish / unpublish / update +
targeting by program/rank/team/territory, permission-gated + audited + rippled.
Library-only (no LMS) is grep-proven by `.claude/gates/training-library-only-guard.sh`.
See `ALIGNMENT-6.15-training.md`. Open product decisions:

1. **Content categories** — is the training set (Policies / Guidelines / FAQs / Video
   tutorials) and kit set (Brochures / Layouts / Images / Videos / Scripts /
   Presentations) confirmed?
2. 🔴 **Which content is gated, by what attribute?** *Demo: placeholder gates
   (rank·gold deck, program·withInvestment brief); team/territory value lists are
   placeholders.* Salmon must confirm the audience rules.
3. **Video hosting** — CDN, embed, or in-app? *Demo: poster + tap-to-play mock; kit
   intro videos link to the client video page.*
4. **Viewed-state** — tracked per partner server-side, or a local visual marker only?
   *Demo: local only.* (Still not completion tracking — just "viewed".)
5. **Y01 discoverability** — the content desk is reachable standalone; wiring it into
   the console sidebar/dashboard nav is a small merge-time task.

---

# Notifications & Administration — Open Questions (Req 6.14 · 6.18)

> Raised during the Req 6.14 (Notifications & Notice Board) + Req 6.18 (Administration, Roles & Audit)
> alignment pass. **Most of 6.18's questions were already logged in the Part 8 · Hardening section above**
> — session/auth (#1, #2), impersonation double-audit (#3), audit retention (#4), audit-export scope (#5),
> compliance read-only role (#6), two-person approval (#7), template-approval workflow (#8). This section
> logs only what those did not already cover. Numbering restarts. Items marked need Salmon before the build.

1. 🔴 **Opt-out vs mandatory notifications** — which of the 14 event types may a partner/client mute, and
   which are **mandatory** (e.g. KYC/booking/settlement)? No per-user notification-preferences screen exists;
   today all types deliver. Needs a Salmon policy before a preferences UI is built.
2. 🔴 **Notice scheduling — send now or schedule?** `P02-compose-notice` offers both a *"Send now"* and a
   *"Schedule for later"* option with a datetime picker, but there is **no scheduler/queue** behind it in the
   prototype — a scheduled notice is recorded, not actually deferred-and-fired. Confirm whether scheduling is
   required, and if so the send-window/timezone rules.
3. 🔴 **Push provider config** — APNs/FCM (or a provider like OneSignal)? No push credentials live in the
   panel (correct — they belong in a secrets manager). The template layer (`V01–V03`) is provider-agnostic;
   the actual provider + key management is a merge-time infra decision.
4. 🔴 **Notification templates for all 14 event types** — only **6** canonical push templates are seeded
   (`admin-data.js`: partner-approved/rejected, KYC-verified, booking-confirmed, commission-approved,
   installment-due). The other 8 events (inventory, lead status, meeting, task, document, return, ticket,
   settlement, payment, construction) emit via module ripples with generic copy. Confirm the full copy set so
   every event has a reviewed EN/বাংলা template (surfaced in `ALIGNMENT-6.14-notifications.md`).
5. 🔴 **Task-assignment status set** — `U11` status configuration models task as `Open / In progress / Done`
   as a **placeholder** — internal task hand-offs are not a fully-specified module yet. Confirm the task
   lifecycle states (and whether tasks are even a distinct entity vs lead/ticket sub-states).
6. 🔴 **Investment return-record statuses** — `U11` models return records as `Scheduled / Due / Paid / Hold`,
   but the **With-Investment module is amber-locked pending legal** (Req 6.6), so these are **record-only** with
   no rate/projection shown. The real return-state machine needs Salmon + legal counsel — same discipline as 6.6.
7. 🔴 **Canonical audit-action vocabulary** — audit action strings are currently free-form literals (two are
   built dynamically: `ASSIGN_<KIND>`, `PROGRAM_<ACTION>`), and the seed uses verbs (`PUBLISH_PROJECT`,
   `RELEASE_SETTLEMENT`) that don't exactly match live emitters (`EDIT_PROJECT`, `MARK_SETTLED`). Before the
   Laravel port, a central `AUDIT_ACTIONS` constant would make audit-log filtering/reporting reliable. Not a
   missing-emission gap (the cross-module sweep confirms every module emits) — a consistency decision.
8. 🔴 **System-settings sub-panels not yet built** — `U01–U11` cover gateways, currency, booking/slot rules,
   providers, feature flags, min-app-version, session, invoice/legal wording, **status config**, and templates,
   but **contact info**, **policy/legal body text**, **languages list**, and **map provider** do not yet have
   their own config screens (clause 6.18.5). Confirm which of these Salmon edits in-panel vs dev-configures.

---
_Logged during the Req 6.14 + 6.18 alignment pass. See `ALIGNMENT-6.14-notifications.md` and
`ALIGNMENT-6.18-administration.md` for the clause-by-clause diff. Every item is an intentional, surfaced gap._

# CRM / Admin Panel — Open Questions (Req 6.17 · Dashboard & Reporting)

> Raised during the Req 6.17 reporting pass (grouped metrics, live+scoped reports, filters,
> gated CSV export). Placeholdered in-screen, never guessed. **Questions 1 and 3 need Salmon.**
> See `ALIGNMENT-6.17-reporting.md` for the clause-by-clause diff.

1. 🔴 **Non-sensitive / exportable classification** — the confirmed list of which reports may leave the
   org as CSV. The prototype gates on an `exportable` flag: aggregate reports (lead-conversion, inventory,
   territory-activity, meeting-outcomes, task-completion, document-activity, helpdesk) are exportable;
   anything with identifiers/amounts (sales-records, commission, settlement-recon, investment-return) is
   view-only. Salmon confirms the final classification.
2. 🔴 **Report periods** — default date ranges and whether Salmon runs a fiscal calendar. The viewer
   exposes `From`/`To` date filters but assumes no fiscal-year boundaries; "last 30 days" is used loosely
   in metric labels. Confirm default ranges and fiscal calendar.
3. 🔴 **Team-lead / manager reporting scope** — the exact boundary. `scopeFor('MANAGER')` is a placeholder
   assigning one **division** (`Chattogram`); a real Manager may own a district, a set of teams, or a
   territory. There is no `TEAM_LEAD` panel role (team leads are mobile partners). Confirm whether report
   scoping is by division, district, team, or an assigned-territory list — the mechanism is boundary-agnostic.
4. 🔴 **Metric trend deltas** — vs the previous period, or absolute values? The `MetricCard` supports a
   delta + direction, but the vs-previous-period basis (and which metrics get one) is unconfirmed; deltas
   are shown only where a period figure is derivable.
5. 🔴 **Investment-return metric** — what may be shown, given the legal markers on amounts (Req 6.6). The
   metric renders `🔒 legal` and the report is amber-locked (`[AMOUNT — LEGAL SIGN-OFF REQUIRED]`); no rate,
   projection, or total is displayed until legal delivers the return model.

---
_Logged during the Req 6.17 reporting pass. Every item is an intentional, in-screen gap._
