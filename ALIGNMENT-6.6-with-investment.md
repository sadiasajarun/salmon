# Alignment — With Investment: Investment Record & Return Tracking (Req 6.6)

> **The amber-locked module.** "With Investment" lets a partner put their own money
> into a Salmon project and receive a return plus a higher commission. That sentence
> — *take money, promise returns, pay more for bringing in others* — has a specific
> legal shape, and **Salmon's counsel has not defined the rules.** Until they deliver
> the commercial terms, the return-schedule structure and the disclaimer copy, the
> app must be a **passive record-keeper**: it computes nothing, promises nothing,
> executes nothing, disburses nothing. The mechanism ships to the demo; the module
> does **not** go live until counsel delivers OQ items 1–4.

Reconcile-and-close-gaps pass. Status found by **inspecting the real code** across
the three surfaces, then patched. The discipline is enforced in **code, copy, UI —
and a build guard** — not just a note.

Surfaces:
- **Partner mobile** — `app/partner/{invest-enquiry,enquiry-status,invest-record,return-schedule,return-entry-detail,disclaimer,program-with,investment}.page.html` + `app/assets/js/{partner-invest,partner-ledger}.js`
- **Admin panel** — CRM `crm-prototype/screens/B11-investment-records.html` + `assets/js/{invest,invest-data}.js` (new); common commission ledger L01–L04 (`commission*.js`)
- **Live demo** — `demo/server.js` (enquire / confirm-share, permission `investment.confirm`), `demo/public/{partner,admin}/app.js`, `demo/data.json` (Nasrin seed)
- **The fence** — `.claude/gates/invest-prohibition-guard.sh` (new)

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.6.1 | Partner **expresses interest** in an approved share/partnership/property | P51 `invest-enquiry` | **Done** | **Done** | Framed exactly as *a request to be contacted* — "not a purchase, not a commitment, not a transaction." Offline draft, offline-submit guard. (Shared-selector wiring from 6.5 is a merge-time task — logged.) |
| 6.6.2 | Capture **project/share ref, interest, preferred contact time, notes** | P51 | **Done** | **Done** | All four captured. The "interest amount" is explicitly **indicative, for discussion only, nothing charged** — a description of intent, not an in-app payment. |
| 6.6.3 | Staff record a **confirmed entry, effective date, client-approved terms** — after **offline** documentation + payment verification | P53 `invest-record`; **NEW** CRM **B11** | **Partial** — P53 rendered a real ৳2,500,000; no *effective date* / *client-approved terms* fields; **no admin record screen** in the CRM prototype at all | **Done** | P53 amount → **`[AMOUNT — LEGAL SIGN-OFF REQUIRED]`**; added **Effective date** = `[EFFECTIVE DATE — CLIENT-APPROVED]` and **Client-approved terms** = `[CLIENT-APPROVED TERMS REQUIRED]`; kept the "the app did **not** process this payment" framing. **New CRM B11 desk** records the share — **no amount field exists** (staff record the *shape*), permission-gated (`RECORD_INVESTMENT_SHARE` = Finance/Super-Admin), audited old→new, ripples to P53. |
| 6.6.4 | **Return schedule** — Paid / Pending / On Hold, **manually recorded** | P54 `return-schedule`, P55 `return-entry-detail`; B11 | **Drifted** — P54/P55 rendered a real ৳31,250 on every row | **Done** | **Every amount → the marker.** Status-only table kept (no chart, no trend, neutral not-green palette); added **frequency** = `[FREQUENCY — CLIENT-APPROVED]`; **no** "next payment due" countdown, **no** running total, **no** projection. B11 return schedule is status-only; *Add return entry* / *Set status* carry **no amount field** — the amount stays the marker. |
| 6.6.5 | Partner requests **consultation / site visit**, views follow-up status | P53 → existing `request-meeting` / `request-visit` | **Partial** — no path from the investment flow | **Done** | P53 links to the **existing** meeting/visit flow (no parallel one), tagged `?ctx=investment&ref=…`. The investment context just tags the request. |
| 6.6.6 | Higher-tier commission entered/approved through the **common commission ledger** | CRM `commission-data.js` / L01–L04; partner `partner-ledger.js`; demo | **Done (verified)** | **Done + demonstrated** | Confirmed there is **no separate higher-tier engine** anywhere: With-Investment is a `program` **tag** on an ordinary commission; `amountBdt` is `null` until a human types it on **L02** (no rate table, no formula); L01 already renders the tag. Added a `withInvestment`-tagged **approved** row to `partner-ledger.js` so the partner's earnings **demonstrably** carries a higher-tier commission — same Pending→Approved→Settlement→Settled path. Demo: Nasrin's `COM-2024-0685` runs the same queue. |
| 6.6.7 | **No** guaranteed-return calc, **no** investment execution, **no** disbursement in the platform | **NEW** `invest-prohibition-guard.sh`; whole module | **Partial** — the discipline was copy-only; **no build check**; and real amounts were on screen | **Done** | **The fence exists.** A negation-aware grep gate fails the build on (A) promise/projection language used as a promise, (B) a payout/disburse/calc mechanism, (C) any real return/investment amount instead of the marker (+ asserts the marker is present). It **caught the real drift** (7 unmarked amounts) and now **passes** (`{promise:0,mechanism:0,unmarked_amount:0}`). Grep proves: no calculation, no payout, no guarantee-as-promise, every amount held. |
| 6.6.8 | **Independent** construction/development is the partner's own responsibility, **outside** the platform | P56 `disclaimer` | **Missing** | **Done** | New boundary card on P56: the app does not manage, execute, or take responsibility for independent development activity — with the exact wording held as **`[CLIENT-APPROVED COPY REQUIRED]`**. |

## The discipline, encoded (clause 7) — what the fence checks

`bash .claude/gates/invest-prohibition-guard.sh` — scoped to the **dedicated
With-Investment module files** (the Part-6 commission ledger is a separate module
with its own honesty rules; the live-demo investment flow was verified clean by hand):

- **(A) promise / projection language** — `guaranteed·guarantee·assured·risk-free·projected·projection·forecast·invest now·profit·yield·payout·disburse`. **Negation-aware**: the disciplined copy *names* these ideas to negate them ("Salmon is **not** a guarantor", "returns are **not** guaranteed", "**no** calculator"), so a line with a negation/prohibition token — EN or BN — or a comment line, is allowed. A bare promise is a **FAIL**.
- **(B) mechanism** — a return calculator (`calculateReturn`, `returnRate * …`), a payout/disburse button, a `next-payment-due` countdown, a `running-total`. **FAIL**, no exception.
- **(C) amount-marker discipline** — no non-null numeric amount may live in the module's data (`partner-invest.js`, `invest-data.js`). Every value is held as `[AMOUNT — LEGAL SIGN-OFF REQUIRED]`. The marker must also be **present** (positive invariant). **FAIL** on any real amount.

The single gate on the partner side: `PartnerInvest.LEGAL_SIGNOFF_RECEIVED = false`.
While false — and it stays false until counsel delivers — **no amount renders**, even
if a figure were present in the data. The seed amounts are `null`, so nothing real
exists to leak. Flipping it is a **legal** decision, not a code decision.

## What is HELD as a marker (nothing legally consequential is invented)

| Marker | Where |
|--------|-------|
| `[AMOUNT — LEGAL SIGN-OFF REQUIRED]` | every return entry (P54/P55/B11) + the recorded investment amount (P53/B11) |
| `[CLIENT-APPROVED TERMS REQUIRED]` | commercial terms on the confirmed record (P53/B11) |
| `[EFFECTIVE DATE — CLIENT-APPROVED]` | the record's effective date (P53/B11) |
| `[FREQUENCY — CLIENT-APPROVED]` | return-schedule frequency (P54) |
| `[LEGAL COPY REQUIRED]` | the disclaimer body (P56) |
| `[CLIENT-APPROVED COPY REQUIRED]` | the independent-activity boundary (P56, clause 8) |

## Admin recording discipline (B11) — the honest mechanism

The admin **records the shape, never the money.** *Record confirmed share* and
*Add return entry* have **no amount input** — staff record that a share/entry exists
(reference, status, offline-verification note); the money value is held for counsel.
Recording is permission-gated (`RECORD_INVESTMENT_SHARE` / `RECORD_RETURN_ENTRY` =
Finance/Super-Admin; `VIEW_INVESTMENT` adds Legal + Manager), every action **audits**
old→new and **ripples** to the partner's read-only screen. A status **correction**
path exists (OQ #8) — audited with a reason, never a silent edit. Reachable from the
partner profile's participation card for With-Investment partners.

## UI restraint = a safety feature

Return/record screens read as a **financial record**, not a wealth pitch: neutral
grey/charcoal (Paid is a **neutral** chip, never green), no aspirational imagery, no
upward arrows, no "grow your wealth", the disclaimer prominent (not in an accordion).
The enquiry (P51) may be warmer — it is only a contact request. The legacy
`investment.page.html` was neutralised (green Paid pill → neutral; dead button →
link; amounts → markers) and marked as superseded by the P53–P56 flow.

## Done-when checklist

- [x] This table maps all **eight** clauses with the diff, marking mechanism-complete vs legal-blocked
- [x] **The prohibition guard exists** — a build check fails on promise-language / payout / calc / unmarked amount; it caught the real drift and now passes (grep-proven)
- [x] Interest expression (P51/P52) complete, framed as a **contact request**, not a transaction
- [x] Confirmed records (P53) **staff-entered, offline-verified, read-only** on the partner side, with `[CLIENT-APPROVED TERMS REQUIRED]` + a real admin recording surface (B11)
- [x] Return schedule (P54/P55) is a **status-only table** — every amount `[AMOUNT — LEGAL SIGN-OFF REQUIRED]`, no projection, no countdown, no running total
- [x] Disclaimer (P56) **prominent** and `[LEGAL COPY REQUIRED]`; independent-activity boundary stated with `[CLIENT-APPROVED COPY REQUIRED]`
- [x] Higher-tier commission flows through the **common ledger, hand-entered** — no separate engine (verified); demonstrated on the partner earnings side
- [x] Consultation/visit **reuses the existing flow** (no parallel one)
- [x] UI **restrained and formal** — reads as a financial record
- [x] Demo runs with all markers visible; the script **says the discipline out loud** (Flow 6, incl. the enquiry→record loop + common-ledger commission)
- [x] Every staff action audited (B11) + rippled
- [x] All **8** open questions logged; **1–4 flagged ship-blocking legal deliverables**

## Cross-surface notes (honest)

- **Two investment data stores** exist because partner-mobile (`partner-invest.js`)
  and admin (`invest-data.js`) are separate prototypes; both hold amounts as markers.
  Unifying to one seed is a merge-time task for the Laravel + React build.
- **Audit** on the CRM B11 desk uses the same `Audit.audit` old→new trail as every
  other console action. The live-demo activity feed is a demo stream (capped/reset),
  not a permanent audit trail — a build-time concern, logged.
- **Ship gate:** the mechanism is complete and demoable with markers. The module
  **cannot go live** until counsel delivers OQ items 1–4 below.
