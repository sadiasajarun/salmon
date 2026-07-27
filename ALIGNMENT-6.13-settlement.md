# Alignment — Commission Settlement Request & Status (Req 6.13)

> **The safety is the absence of a bank field, made intentional.** The app records
> a *request* (an amount) and, later, that finance *paid it externally*. It never
> moves money and never holds a payment destination. Trust through what's *not* there.

Reconcile-and-verify pass. This module was **already built** as the partner payout
half of Part 6 (settlement request state machine + the finance `M0x` desk). Status
found by **inspecting the real code**; the module is clause-complete and disciplined.
This pass **verified** it and added the missing **mechanical fence** — a build guard
that proves, by grep, that no bank/account/MFS/card field exists anywhere.

Surfaces:
- **Partner mobile** — `app/partner/{request-settlement,settlement-submitted,settlement-status,settlement-history}.page.html` + `app/assets/js/{settlement-state,partner-ledger}.js`
- **Admin panel** — CRM `M01–M04` (`commission.js` / `commission-data.js`) — the finance payout desk
- **Live demo** — `demo/server.js` (request → approve → settle), `demo/public/{partner,admin}/app.js`
- **The fence** — `.claude/gates/settlement-no-bank-field-guard.sh` (new)

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | Notes |
|---|--------|----------------|--------|-------|-------|
| 6.13.1 | Partner submits a settlement request against **available approved balance** | ST01 `request-settlement` (P46) | **Done** | **Done (verified)** | **One input: amount**, capped at `PartnerLedger.approvedBalanceBdt()`. Pending is never requestable — only Approved. Submit disabled until `0 < amount ≤ approved`. |
| 6.13.2 | **No bank / MFS / card / merchant account details** collected or stored — mobile or CRM | whole surface | **Done (copy-only)** | **Done + fenced** | **New grep guard** scans 15 settlement files across all three surfaces → **0 bank/account/IBAN/MFS/card fields**. "Bank" appears only as a channel *category* option, never an account field. The reference input is explicitly "non-sensitive · NOT an account number". |
| 6.13.3 | Prevent requests **exceeding balance** or **duplicating** an active request | ST01 + `settlement-state.js` | **Done** | **Done (verified)** | Exceed guard: over-balance input flagged, submit blocked. Duplicate guard: `SUBMIT` is a no-op while `inFlight` (SUBMITTED/APPROVED/ON_HOLD); P50 "a request is being processed" block replaces the form. Offline is blocked **before** dispatch (never optimistic, never queued). CRM M02 also blocks approval when `amount > approvedBalance` (`overCap`). |
| 6.13.4 | Finance **review / approve / reject / hold** with notes | CRM M01/M02 (`commission.js`) | **Done** | **Done (verified)** | M01 queue sortable by age; M02 approve (balance-capped) / reject / hold, each with a **note/reason** shown to the partner, permission-gated (`APPROVE/REJECT_SETTLEMENT`), audited old→new, rippled to P48. |
| 6.13.5 | Finance records **channel category, reference, date, evidence** — **after external process** | CRM M03 `mark-settled` | **Done** | **Done (verified)** | "The panel does **not** pay — finance already paid externally; this screen only **records** it." Captures payment date, **channel category** (Cash/Bank/bKash/Nagad/Cheque/Other — a category, never an account number), non-sensitive reference, evidence upload. Evidence is **filed against the record, never shown to the partner**. |
| 6.13.6 | **Notify** partner on approved / rejected / held / settled | P48 `settlement-status` + ripples | **Done** | **Done (verified)** | Every M0x mutation ripples to the partner (Toast + mobile ripple) and advances P48's timeline: Submitted → Approved → Settled, or Rejected / On hold with the finance reason. Partner sees **status only** — never the finance reference, evidence, or approval trail. |

## The fence (clause 6.13.2) — what the guard checks

`bash .claude/gates/settlement-no-bank-field-guard.sh` → **PASS** (`{bank_fields:0, files:15}`).

- Fails the build on any payment-destination field: `iban·swift·routing·sort-code·account number/holder·card/PAN·bank account/number/name/details·mfs/wallet number·merchant account`.
- **Negation-aware**: the disciplined copy names these ideas to negate them ("**NOT** an account number", "deliberately **no** bank field", "**no** account details are needed"); a line with a negation/label token (EN + BN) or a comment is allowed.
- **Positive invariant**: the "absence is intentional" framing must be present on the request screen — the standout that makes the missing field a feature.

## The standout, in copy (both sides)

- **Partner (P46):** *"Salmon's finance team pays your settlement through your agreed method. Just tell us how much to release — no bank or account details are needed."*
- **Finance (M01/M03):** *"There is no bank field on this queue — the data model doesn't hold one."* · *"There is no bank-account field — not even here."*

## Screen map (prompt ST0x → built)

| Prompt | Built |
|--------|-------|
| ST01 Request settlement | `request-settlement.page.html` (P46) — one input, capped, no bank field |
| ST02 Request submitted | `settlement-submitted.page.html` |
| ST03 Settlement queue (finance) | CRM `M01-settlement-queue.html` |
| ST04 Settlement decision | CRM `M02-settlement-decision.html` |
| ST05 Mark settled | CRM `M03-mark-settled.html` — channel category/reference/date/evidence |
| ST06 Status (partner) | `settlement-status.page.html` (P48) + `settlement-history.page.html` |

## Done-when checklist

- [x] Maps all 6 clauses across the three surfaces
- [x] One-input request capped at **approved** (pending never requestable)
- [x] **Zero bank fields, grep-proven** by a build guard (15 files, 0 hits) — the absence framed as intentional in copy
- [x] Exceed + duplicate guards work (partner state machine + CRM M02 cap)
- [x] Finance approve / reject / hold with notes; mark-settled records channel category / reference / date / evidence after the external process
- [x] Partner notified on every state; sees status only (no finance internals)
- [x] Reuses shared components; ripples to mobile; audited
- [x] Open questions logged (below)

## Open questions

1. **Minimum settlement amount?** *Demo: none enforced beyond `> 0`.* Salmon to confirm a floor (and whether partial settlements are allowed).
2. **Hold rules** — what triggers a hold, and who releases it? *Demo: finance holds with a reason; any finance/super-admin resumes via M02.* The trigger policy is undefined.
3. **Channel categories** — is `Cash / Bank / bKash / Nagad / Cheque / Other` the confirmed list? (shared with Part 6 OQ.)
4. **Partner-facing reference** — auto-generated or entered by finance? *Demo: auto (`ST-2026-###`); M03 lets finance override with a non-sensitive ref.* Salmon to confirm.
