# ALIGNMENT — 6.12 Commission Management

How each of the six clauses is satisfied in the demo. **No rule engine, no
auto-calculation, no suggested amounts** — every amount is human-entered (clause 6).

| # | Clause | Where it lives | How |
|---|--------|----------------|-----|
| **1** | Staff create a commission against a **verified converted lead** or an **approved special case** | `POST /api/commissions` · admin **CM02** (`commission-create`) | Two paths: *from conversion* (pick a verified converted lead with no commission yet) and *special case* (partner + category + **mandatory reason**). Conversion-verify (6.4) also auto-creates a Pending record. |
| **2** | Record: approved amount, partner, lead, project, program, approval date, approver | commission object + admin **CM05** (`commRecord`) | Each record carries `amountBdt, partnerId, leadId, projectId, program, approvedAt, approver, verifiedBy`, shown in the record + source chain. |
| **3** | States **Pending / Approved / Settlement Requested / Settled** | server state machine + `commPill` | `pending → approved → settlement_requested → settled`; settlement request/settle (6.13) flip the underlying commissions; `reversed` is a terminal audited branch. |
| **4** | Only **Approved** is requestable for settlement | `POST /api/settlements/request` + partner earnings UI | Balance only rises on approval; only `approved` commissions are swept into a settlement request. Pending is never spendable — shown as a separate, non-actionable count on the partner side. |
| **5** | Finance can **correct/reverse** with mandatory reason + audit | `POST /api/commissions/correct` · `/reverse` · admin **CM06** | Both require a reason (400 without). Correct records old→new and adjusts the balance; reverse claws back and marks `reversed`. Never a silent edit, never deleted — each is a new `events[]` entry (6.18 audit). |
| **6** | **No automated rule engine** until formulas confirmed | everywhere | There is **no formula, rate table, or MLM logic anywhere**. The amount field is blank at approval and hand-entered. No auto-suggested amount. See open question #2/#3 for the eventual (separate) engine. |

## The standout — CM03 is a verification surface, not a form

`commApproveSurface()` renders **two panels**: the **decision** (hand-entered amount +
program + approval note) beside the **evidence to verify it against** — the lead, the
conversion (when, verified by whom), the partner (ID, rank, program), the project, and
a **reconcile mini-bar** of the partner's recent approved commissions so an outlier
amount is visually obvious. The approver glances right, confirms the number reconciles,
then commits. Approval with context, not a blind number.

## Partner side — feels like gaining

Commission appears traceable to the deal ("🎉 Commission approved: ৳12,000 — Karim
Uddin · Bellissimo"), with a modest (dignified, no confetti) celebration on approval,
**Approved (spendable) vs Pending (not yet)** kept visually distinct on the Earnings
screen, and reversals shown **honestly** (struck-through amount + reason), never hidden.

## Connected flows

Conversion verified (6.4) → Pending in CM01 → Finance approves (CM03) → partner Approved
balance rises → requestable (6.13) → settlement request/settle flip the commission's
state → correct/reverse ripples an honest adjustment to the partner. Every action is
audited (6.18) on the record's `events[]` and the global `auditLog`.
