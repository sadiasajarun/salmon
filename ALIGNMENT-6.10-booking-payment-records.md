# Alignment — Booking, Sales & Customer Payment-History Records (Req 6.10)

Verify-connect-polish pass over three prototype surfaces. Status found by **inspecting the real
code**, then closing the verification-integrity spine. Scoped to the **static prototypes** (CRM
`crm-prototype/*` + partner `app/partner/*` + their JS) and this doc; the **connected demo** was
being actively worked by a parallel pass and left untouched (its clauses are marked _connected-pass_).
Siblings: [`ALIGNMENT.md`](ALIGNMENT.md),
[`ALIGNMENT-6.9-meetings-visits.md`](ALIGNMENT-6.9-meetings-visits.md).

## The three surfaces

| Surface | Path | What it is |
|---|---|---|
| **Partner mobile** | `app/partner/{booking-record,customer-details,offline-payment,attach-evidence,record-status}.page.html` + `app/assets/js/{partner-ops,partner-sales,project-selector}.js` | Static prototype — create a record-only booking + payment claim. |
| **Admin CRM** | `crm-prototype/screens/{I03,J03,K01,K02,K06}` + `assets/js/{finance,finance-data,permissions}.js` | Static finance desk. |
| **Live demo** | `demo/server.js` + `demo/public/{partner,admin}/app.js` | Connected SPA — _owned by the parallel pass this cycle._ |

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.10.1 | Authorized partner creates a booking against a **verified lead** + selected inventory (shared selector) | `booking-record.page.html` | **Done (partner)** | **Done (partner)** | Partner gates Continue on a **verified lead** (`visitCompleted`/`converted`) + reuses the **shared `ProjectSelector`** (`mode:'unit'`, only available units). "Authorized-only vs any partner" logged (OQ #1). Demo stub ungated — _connected-pass_. |
| 6.10.2 | Capture booking date, agreed property/share, down-payment/installment, offline **method (category)**, **non-sensitive reference**, verification status | partner `offline-payment`; CRM `finance-data` | **Partial (CRM)** — partner captured the full set; **CRM offline record omitted date/reference/evidence** | **Done (CRM)** | Enriched `offlinePayments` model with `bookingDate`, `kind` (down-payment/installment), `reference`, `unit`, `leadId`, `evidence` pointer. Method stays a **category**, never an account number. |
| 6.10.3 | Attach NID/photo/nominee, booking forms, payment evidence via a **secure doc repository** | partner `customer-details`/`attach-evidence`; CRM | **Partial** | **Partial (honest)** | Partner evidence screens present (NID/photo/nominee/forms/proof) referencing the shared secure-repo string; the CRM offline record now carries an **`evidence` pointer** into the repository. A real repository component exists only in the demo (6.7) — wiring the static evidence boxes into it is a merge-time task (logged). |
| 6.10.4 | Finance **verify / correct / reject / reverse** with **mandatory reason + audit** (never silent, never deleted) | CRM **J03 → BR04** `finance.js` | **Partial** ⭐ — verify existed; **reject had no mandatory reason; correct & reverse did not exist** for payment-history entries | **Done** ⭐⭐ | Rebuilt J03 as the **payment-history verification desk**: all four verbs. **Verify** (confirm + evidence check), **Correct** (edit amount/method/reference — reason required, original kept in audit), **Reject** (reason required), **Reverse** (of a verified entry — reason required, money-moves-outside framing). Each gated by a **dedicated permission** (`VERIFY/CORRECT/REVERSE_PAYMENT`), audited old→new, rippled to the partner, and appended to a per-record **history** — nothing hard-deleted. |
| 6.10.5 | Controlled payment-history timeline for staff; **simplified status to partner** | partner `record-status`; CRM J03/K01 | **Done** | **Done (strengthened)** | Partner sees a two-state pill (Verified/Unverified) + explicit wall copy. Staff now see the **full status set** (Recorded·unverified / Verified / Corrected / Rejected / Reversed) + a **History** dialog with every action, actor, reason and old→new. K01 keeps pending money on its own row, never folded into paid. |
| 6.10.6 | Partner records are **record-only** (no money, method = category); client online booking/installment via the **gateway module**; the two visibly distinct; no card credentials | partner pages; CRM I0x/J0x | **Done** | **Done (re-verified)** | Emphatic record-only framing on partner booking/offline-payment; the BR04 desk repeats "moves no money · method is a category · no account or card numbers." Gateway (webhook/wire) reconciliation stays a **separate** CRM queue. Grep confirms **zero** card/account-number fields anywhere. |

## The verification spine — BR04 (`finance.js` J03)

```
partner records an offline payment (a CLAIM)  →  status: Recorded · unverified
finance:  Verify   → Verified      (confirm + evidence check; no reason needed for a positive verify)
          Correct  → Corrected     (amount/method/reference edited · REASON REQUIRED · original kept in audit)
          Reject   → Rejected      (REASON REQUIRED · shown to partner · record retained)
          Reverse  → Reversed      (of a Verified entry · REASON REQUIRED · money handled outside the panel)
every action → Audit.audit(old→new) + partner ripple + appended to the record's history[]   (never hard-deleted)
```

Permissions added: `VERIFY_PAYMENT`, `CORRECT_PAYMENT`, `REVERSE_PAYMENT` = `[Super Admin, Finance]`
(`REJECT_PAYMENT` reused). The recorded-**claim** vs finance-verified-**fact** distinction is the
integrity of the whole module — a partner row never counts as money until finance verifies it.

## Cross-surface notes (honest)

- **Record-only, not a payment** is stated on every partner booking/payment screen and repeated on the
  BR04 desk metaline — the safety here is clarity, per the client's ask.
- **Gateway boundary respected:** partner offline records (J03) and client gateway payments (I01/I02
  webhook + J01/J02 wire) are separate queues with separate data; the offline path holds no card data,
  the gateway path reconciles a reference, never card data.
- **Connected demo left untouched** this pass by design. Its 6.10 gaps mapped but not changed: the
  partner `booking-record` is a non-persisting stub with no verified-lead gate; evidence not wired into
  the demo's real repository. These belong to the connected pass.

## Done-when checklist (this pass's scope)

- [x] Clauses mapped across all three surfaces with the diff
- [x] Record-only bookings clearly framed as **not a payment**
- [x] Finance **verify / correct / reject / reverse** with **reason + audit**, nothing deleted
- [x] Full staff timeline (+ History dialog) vs partner simplified status — the wall holds
- [x] **No card/account fields** anywhere (grep-clean); gateway boundary respected
- [x] Reuses shared selector; evidence references the secure repo (full wiring logged)
- [ ] Live ripple to mobile — _connected-pass; not in this pass's scope_
- [x] Open questions logged

_Every "After = Done" is backed by a real code change in the listed static file. Connected-demo items
are intentionally out of scope this pass to avoid colliding with the parallel worker on untracked files._
