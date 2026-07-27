# Salmon Live Demo — Open Questions

Business rules and product decisions the demo deliberately leaves undefined. Items
marked ⚠️ are decisions Salmon's operations lead must make before this ships for real.

## Commission management (6.12)

1. 🚩⚠️ **What event triggers commission creation** — conversion verified, booking
   confirmed, or first payment? **This is the single most-referenced unknown in the
   whole project** (recurs across 6.4 / 6.6 / 6.12) and must be answered once. *Demo
   choice: **conversion verified** (a verified conversion creates the Pending record).*
2. ⚠️ **Zero Investment commission formula** — for the eventual (separate, later) rule
   engine and the data model. *Demo: none — every amount is hand-entered (clause 6).*
3. ⚠️ **Higher-tier With Investment rate/trigger** — same; no engine built until
   confirmed. The data model carries `program` so the eventual engine can branch.
4. **Special-commission categories** — confirmed list? *Demo: Bonus / Adjustment /
   Goodwill.*
5. **Reversal after settlement** — clawback rules if a *settled* deal later refunds?
   *Demo: reverse is allowed and audited; balance clawback only applies while the
   amount still counts toward the balance (approved / settlement-requested).*
6. **Who approves** — Finance alone, or Finance + a threshold above which Super Admin
   co-signs? *Demo: Finance (or Super Admin); no co-sign threshold.*

> **Question 1 is the critical recurring one** — pin it down before any engine work.

## Tasks & Targets module

1. ⚠️ **Target metric definition** — sales volume in BDT, converted-lead count, or a
   mix? *Demo choice: converted-lead count* (derived from Part 4 leads). Logged here
   because Salmon must confirm the metric.
2. ⚠️ **Target period** — monthly, quarterly, project-based, or all three? *Demo
   choice: monthly (`2026-07`).* Affects the shape of P66 (partner targets) and
   W07/W08 (admin target management).
3. **Recurring tasks** — needed for daily activities like "check in with 3 leads per
   day"? Not built; every task is one-off in the prototype.
4. **Overdue policy** — hours vs days? Does an overdue task auto-lock, or can the
   partner still complete it late? *Demo choice: due-date passed → `Overdue`, partner
   can still complete late.*
5. **Task cancellation visibility** — do partners see cancelled tasks in a history,
   or do they vanish entirely? *Demo choice: cancelled tasks show briefly with a
   "cancelled" note, then drop out of the open list.*
6. **Evidence requirements** — the confirmed list of evidence types (photo,
   document, geo-tag)? *Demo: a single mock file reference; no type enforcement.*
7. **Team-lead scope** — can a team lead assign only to *their* team, or also to
   unassigned partners in their territory? *Demo choice: own team only (enforced
   server-side).*
8. **Missed-activity SLA** — after what threshold does a missed activity escalate to
   the manager's queue (W06)? *Demo: appears immediately on overdue.*
9. ⚠️ **Territory-trend metric mix** — the proposal says "activity trend"; needs a
   concrete metric. *Demo choice: tasks assigned, tasks completed, completion rate,
   and target achievement per territory.*
10. **Task template ownership** — org-level shared, per-manager private, or both?
    *Demo: org-level shared library (X03).*

> Questions **1, 2 and 9** are business rules Salmon's operations lead must define.

## Partner dashboard (Req 6.2)

1. **Target metric** — sales volume (BDT), converted-lead count, or a mix? *Demo:
   converted-lead count* (see Tasks & Targets Q1). The dashboard target bar shows the
   count fraction accordingly.
2. **Target period options** — which periods are selectable (month / quarter /
   project)? *Demo: the partner's available target periods (monthly).* The dashboard
   has a period switcher over whatever periods exist for that partner.
3. **Verified sales volume** — lifetime, or period-scoped to match the target?
   *Demo: derived as the sum of starting prices of the partner's converted-lead
   projects (a lifetime proxy).* Salmon must define the real figure's source + scope.
4. **Investment-return summary** — what exactly shows for With Investment partners,
   given amounts are `[LEGAL SIGN-OFF REQUIRED]`? *Demo: the Returns chip shows
   "Recorded" (never a number) and links to the investment record; Zero-Investment
   partners show `—` for layout stability.*
5. **Training items** — a count, a to-do list, or a link? What's the source? *Demo:
   surfaced as a small count in the ambient strip only (no training module exists).*
6. **Earnings trend sparkline** — is there real historical per-period data to draw?
   *Demo: deferred — no reliable history, so the dashboard ships the target progress
   bar only (no sparkline), per the "restraint at this width" guidance.*

## Zero Investment Referral & Lead Tracking (Req 6.4)

1. ⚠️ **What event counts as "conversion"?** Booking-record confirmed, first payment
   received, or the lead simply marked converted? *Demo choice: a Manager/Super Admin
   marks the lead converted, which creates a Pending commission.* This is the **same
   recurring question** flagged in Part 4 and Part 6 and must be defined consistently —
   the whole payout model hangs on it. **(Salmon — business.)**
2. ⚠️ **Is an attested checkbox legally sufficient** for the per-lead consent (6.4.2),
   or does Salmon's data-protection obligation require stronger capture — a recorded
   attestation, or the referred person's own confirmation (OTP/SMS)? *Demo: a mandatory,
   explicit, un-pre-ticked checkbox stored with attestation text + timestamp.* **(Salmon — legal.)**
3. **Internal status set** — how many states does the manager's full pipeline have
   beyond the partner's six? *Demo: the CRM models 10 internal states
   (`new, contacted, qualified, meetingScheduled, visitScheduled, visitCompleted,
   negotiation, converted, onHold, rejected`) projecting down to the six partner states;
   the connected demo currently uses six internal states. Also unresolved: whether
   `assignedRep` and `nextAction` are discrete fields (CRM `owner`) or folded into
   follow-up notes (demo).* Salmon must confirm the authoritative internal set.
4. **Lead attribution on partner team/territory transfer** — if a partner is later
   moved (6.1 Step 2), does the lead keep its **original** four-way attribution or get
   reassigned? *Demo: preserved as submitted (attribution stamped once, at submit).*
   Salmon must confirm the rule.
5. ⚠️ **Lead deduplication** — if the same buyer is submitted by two partners, who gets
   credit? *Demo: no dedup; both leads exist independently.* Needs a first-touch /
   last-touch / territory rule. **(Salmon — business.)**
6. **Can a partner edit or withdraw a submitted lead**, or is it immutable once sent?
   *Demo: immutable — once submitted the partner only watches the six-state projection.*
7. **Does the partner ever see the buyer's contact details after submission**, or only
   status? *Demo: the partner sees the prospect's name/phone/project it itself submitted,
   plus the six-state timeline — never the internal conversation, owner, or notes.*
   Salmon should confirm how much of the buyer's detail a partner retains post-submit.
8. **Who may verify conversion** — a Manager alone, or Manager + a second sign-off?
   *Demo: Manager or Super Admin, single sign-off (`lead.convert`).* Salmon may want a
   two-person rule since verification creates money downstream.

> Questions **1, 2 and 5** need Salmon (business + legal) before this ships for real.

## Earlier modules (carried forward)

- **KYC gating on booking** — does a verified KYC gate booking, or is it advisory?
  *Demo: KYC is surfaced but does not hard-block the booking flow.*
- **With Investment** — commercial terms, return rates and disclaimer copy are
  `[LEGAL SIGN-OFF REQUIRED]` throughout; the app records the shape only.

## With Investment — Investment Record & Return Tracking (Req 6.6)

Mostly **legal deliverables**, mostly **ship-blocking**. The mechanism is built and
demoable with every value held as a marker; the module **cannot go live** until
counsel delivers items 1–4. See `ALIGNMENT-6.6-with-investment.md` and the fence
`.claude/gates/invest-prohibition-guard.sh`.

1. ⚠️ **Commercial terms** — the full legal/commercial rules for With Investment.
   *Blocks the module.* Held as `[CLIENT-APPROVED TERMS REQUIRED]`.
2. ⚠️ **Return-schedule structure** — frequency, how entries are determined, what
   "On Hold" means. *Blocks P54.* Held as `[FREQUENCY — CLIENT-APPROVED]` +
   `[AMOUNT — LEGAL SIGN-OFF REQUIRED]`.
3. ⚠️ **Disclaimer copy** — the exact wording, from counsel. *Cannot ship without
   it.* Held as `[LEGAL COPY REQUIRED]` on P56 (and P53/P54/P55 forward to it).
4. ⚠️ **Higher-tier commission** — rate / eligibility / trigger / approver. The
   *mechanism* is settled (common ledger, hand-entered, no formula); the *business
   rule* behind the number is a legal/commercial decision. *Ship-blocking.*
5. **Eligibility** — who is eligible for With Investment, and how is that decided?
   (shared with Req 6.1 / 6.3 eligibility gate.)
6. **Independent-activity boundary** — the exact client-approved wording for clause 8.
   Held as `[CLIENT-APPROVED COPY REQUIRED]` on P56.
7. **Closing participation** — does closing a partner's With-Investment participation
   (Req 6.3) affect existing recorded returns? Demo: shares/returns are retained,
   not deleted; the interaction rule is undefined.
8. **Return-entry corrections** — if staff mis-record an entry, what is the
   audit-safe correction path? *Demo choice:* B11 "Set status" changes an entry's
   status with a **required, audited reason** — never a silent edit; amount stays a
   marker. Salmon to confirm whether corrections need a second approver.

> Questions **1–4** are legal deliverables that **block the module from shipping.**
> The mechanism can be built and demoed with markers; it cannot go live until
> counsel delivers.
- **Settlement channel** — the app records a channel *category* (Cash / Bank /
  bKash / Nagad / Cheque / Other) and a non-sensitive reference only; it never
  stores bank/account/IBAN details and never moves money.

## Secure Document Repository (Req 6.7)

1. ⚠️ **Object-storage provider** — AWS S3 (SSE-KMS), or a Bangladesh-local provider
   for data residency? Affects the encryption + backup design. *Demo models an
   S3-with-SSE private bucket via `storageKey`; no file is ever statically served.*
2. **Malware-scanning service** — which one (ClamAV self-hosted, a cloud AV API,
   VirusTotal), and **sync vs async**? *Demo: an async mock scanner with the correct
   state machine (`scanning → clean/quarantined`); swap the stub for the real call.*
3. **File type/size limits per document type** — the confirmed matrix. *Demo seeds
   plausible per-type `allowedExt` + `maxSizeKb` in the registry; Salmon must confirm.*
4. ⚠️ **Retention periods per document type** — Bangladeshi legal/finance requirements
   apply (deeds effectively permanent; receipts ~7 yrs; correspondence shorter). *Demo
   uses config-driven `retentionYears` per type as placeholders — counsel must confirm.*
5. **Signed-URL TTL** — how short? *Demo: 300s (45s in fast-demo mode). Confirm the
   real value against usability vs exposure.*
6. ⚠️ **Backup/restore RPO/RTO** — Salmon's requirements for the encrypted backup of the
   document store. *Demo acknowledges backup/restore as a documented procedure only;
   infra is out of prototype scope.*
7. **Verification status values** — the confirmed set. *Demo: Uploaded / Under review /
   Verified / Rejected / Superseded. Confirm whether more states are needed.*
8. **Partner-published summaries** — which legal summaries are published to partners,
   and **who decides / signs off**? *Demo: a Legal officer flags a `legal_summary` doc
   `partnerVisible` + published; raw deeds are never partner-visible.*
9. **Nominee information** — is it a document, structured data, or both? *Demo treats it
   as a `nominee` document type (customer family); if it is also structured fields on the
   customer record, both should link to the same customer via the polymorphic model.*
10. ⚠️ **Data-residency / privacy compliance** — Bangladeshi personal-data rules for
    storing NID/passport copies (retention, access, cross-border transfer, right to
    erasure vs the "never hard-delete" audit principle). *Demo: soft-delete + audit
    trail; the erasure-vs-retention tension is a legal/privacy decision for Salmon.*

> Questions **1, 4, 6 and 10** are compliance/infrastructure decisions Salmon and its
> counsel must make.

## Program Enrolment & Information (Req 6.3)

These govern the two program information screens (P17/P18), enrolment (P04/P19) and
the admin participation panel (B03/B06 + demo admin). Items 1–4 **block final
sign-off** — they need Salmon or its counsel; the prototype ships placeholders.

1. ⛔ **Client-approved copy for all six sections** (description, eligibility,
   responsibilities, benefits, conditions, disclaimers) of **both** programs. The
   screens render `[CLIENT-APPROVED COPY REQUIRED]` blocks until Salmon supplies the
   authoritative wording — the prototype never invents program terms. *Blocks sign-off.*
2. ⛔ **Legal disclaimer copy for With Investment** — the mandatory, prominent
   disclaimer is `[LEGAL DISCLAIMER COPY REQUIRED]`; counsel must provide it, plus
   confirm the exact wording of the framing line ("Salmon records participation and
   returns… does not provide investment advice or guarantee any return"). *Blocks sign-off.*
3. ⛔ **Return frequency** — what does Salmon's approved copy actually state:
   monthly, annual, or per-agreement? Shown only as `[CLIENT-APPROVED COPY REQUIRED —
   frequency]`; never a rate or amount. *Blocks sign-off.*
4. ⛔ **With Investment eligibility criteria** — the gate rule that decides who may
   enrol (shared with 6.1 Q4). The demo treats every With enrolment as an
   admin-approved request; the *rule* behind the approval is undefined. *Blocks sign-off.*
5. **Voluntary leave** — can a partner leave a program on their own, or only be
   **closed** by an admin? *Demo choice: admin-only close; the partner has no
   self-close action.* Confirm.
6. **Effect of closing on recorded returns/commissions** — does closing With
   Investment affect returns/commissions already recorded, or only stop **new**
   participation? *Demo choice: closing stops new participation; existing records are
   retained and untouched.* Confirm.
7. **Higher-tier commission mechanics** — is it a different **rate** applied at
   approval time, and **who sets it**? The prototype states only that it is higher and
   **hand-entered**; it never computes or previews an amount. Needs the rate source +
   owner.
8. **Re-enrolment after close** — is re-enrolment allowed after a program is closed,
   and under what conditions? *Demo choice: a closed record cannot be re-activated in
   place (409); re-enrolment would be a new admin decision.* Confirm the policy.

> Items **1, 2, 3 and 4** are Salmon / legal-counsel deliverables and block final sign-off.

## Support & Help Desk (Req 6.16)

1. ⚠️ **Client chat channel — WhatsApp Business API or managed in-app chat?** Salmon
   picks **one** approved real-time channel (recurring — also 6.24). *Demo: a config seam
   (`clientSupportChannel`), default in-app; WhatsApp mode is an honest handoff + status
   stub, never a faked transcript.* **(Salmon — business/compliance.)**
2. ⚠️ **SLA targets per category** — the confirmed response/resolution targets. *Demo
   uses per-priority defaults (urgent 4h · high 8h · normal 24h · low 48h) as
   placeholders.* Salmon must confirm the real matrix (and whether it is per-category,
   per-priority, or both).
3. **Priority levels — the confirmed set?** *Demo: Urgent / High / Normal / Low.*
4. **Ticket categories beyond the four?** *Demo: Customer Care / Sales / Accounts /
   Administration, each auto-routed to an owning role.* Confirm the list + routing.
5. **Escalation rules — auto-escalate aged tickets?** *Demo: aging is surfaced (SLA
   colour + banner + aging buckets) but not auto-escalated — a human works the queue
   oldest-first.* Salmon may want auto-escalation/reassignment past a threshold.

> Question **1** is the recurring channel decision (Salmon — business/compliance); **2**
> needs Salmon's operations lead.

## Meetings, Coordination & Visit Booking (Req 6.9)

1. ⚠️ **Meeting provider** — Zoom / Google Meet / Teams / Calendly (for the recurring
   fixture)? *Demo: a `PROVIDER` seam (Zoom), external link only — the app hosts no video.*
   **(Salmon — business.)**
2. **Slot rules** — duration, buffer between slots, and booking horizon? *Demo: config
   holds `durationMins:30, bufferMins:10, horizonDays:14, cancellationHours:24` as
   placeholders; the slot-instance UI (H01) currently offers 30/45/60 independent of that
   config — the two subsystems unify at the Laravel build.*
3. **Head-office cadence + attendance consequences** — is twice-monthly (1st & 3rd
   Thursday) correct, and what follows an `absent`? *Demo: cadence is a placeholder; the
   attendance enum is attended/absent/excused/pending with no automatic consequence.*
   Salmon must confirm cadence and whether absences escalate.
4. **Visit location** — is a styled map pin enough, or is real geolocation (lat/lng,
   directions) required? *Demo: a free-text location entered at confirm + map-pin framing;
   3D is aspirational.*
5. **Meeting outcome / follow-up model** — a dedicated outcome form, or the internal
   lead-timeline note it uses today? *Demo: outcomes are captured as internal lead-timeline
   notes + consultation prep; there is no separate meeting-outcome record yet.*
6. **Reminder timing** — how far ahead, how many, and via which channel (push/SMS/email)?
   *Demo: confirmation ripples fire; timed reminders are not scheduled (only finance
   installment reminders exist as working machinery).*

## Booking, Sales & Customer Payment-History Records (Req 6.10)

1. **Who can create booking records** — any partner, or only authorized/sales roles?
   *Demo: any partner with a verified lead; an explicit authorization gate is not modelled.*
   Salmon must confirm.
2. **Offline payment-method categories** — the confirmed list? *Demo: Cash / Bank transfer
   / Cheque / MFS (bKash) / MFS (Nagad) / Other — categories only, never an account number.*
3. **Correction / reversal rules** — who may correct or reverse a verified payment, and
   under what conditions (e.g. bounced cheque)? *Demo: Finance/Super-Admin, reason
   mandatory + audited, nothing deleted; a second sign-off is not required.* Salmon may
   want a two-person rule since reversal un-counts money.
4. **What the partner sees of verification status** — the exact simplified states? *Demo:
   the partner sees Verified / Unverified (and Rejected/Reversed as terminal); the full set
   Recorded·unverified / Verified / Corrected / Rejected / Reversed stays staff-only.*
   Salmon must confirm the partner-facing wording.
5. **Evidence retention & repository wiring** — the static partner evidence boxes reference
   the shared secure repo by concept; production must attach into the real repository
   (6.7) with retention/classification. Logged as a merge-time task.
