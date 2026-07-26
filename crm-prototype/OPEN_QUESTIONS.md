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
