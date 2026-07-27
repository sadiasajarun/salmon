# Alignment — Zero Investment Referral & Lead Tracking (Req 6.4)

Verify-connect-polish pass. Status found by **inspecting the real code** across three surfaces,
then tightened where the client↔admin wall or the conversion trigger could leak. "Where it lives"
lists the canonical file(s). This loop was already built; the job was proving each clause is
honestly satisfied and closing the gaps that hid in the **connected demo** (the surface that must
run Handoff C end-to-end). Sibling passes: [`ALIGNMENT.md`](ALIGNMENT.md) (6.5),
[`ALIGNMENT-6.1-partner-registration.md`](ALIGNMENT-6.1-partner-registration.md) (6.1).

## The three surfaces

| Surface | Path | What it is |
|---|---|---|
| **Partner mobile** | `app/partner/{submit-lead,lead-consent,lead-submitted,leads,lead-detail}.page.html` (P26–P32) + `app/assets/js/partner-sales.js` | Static prototype of the five lead screens. |
| **Admin CRM** | `crm-prototype/screens/F01–F05` + `assets/js/{pipeline,pipeline-data}.js` | Static internal pipeline — full CRM, the wall made visible. |
| **Live demo** | `demo/public/{partner,admin}/app.js` + `demo/server.js` | Connected SPA over one Express store + SSE — the only surface that proves **live client↔admin sync** (Handoff C). |

Because these are three separate prototypes (they merge at the Laravel + React build), the
projection logic is **mirrored**, not shared. Each mirror is flagged and logged as a merge-time unification.

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.4.1 | Submit buyer/investor — contact, project interest, notes | P27 `submit-lead`; demo `lead-new` | **Done** | **Done (verified)** | All three field groups present on every surface (name + phone, project via the shared selector per 6.5, free-text notes). Draft-and-retry (`localStorage` autosave, offline block) confirmed on P27. |
| 6.4.2 | Consent the referred person **permitted** sharing | P28 `lead-consent`; demo `lead-new` + `server.js` | **Partial (demo)** — P28 static screen was exemplary (mandatory · explicit · **not** pre-ticked · unskippable, records `consentAt`), but the **connected demo stored consent as a bare boolean** with no attestation text and no timestamp | **Done** | Demo now records `consent: { attested, at, statement }` — the attestation wording + an ISO timestamp, per lead (`server.js` create-lead). Submitting without consent is a **400**. Admin F02/lead-detail shows the attestation **with its timestamp**. Distinct from the 6.1 registration-time umbrella consent — **both exist**. Legal-sufficiency of an attested checkbox logged (OQ #2). |
| 6.4.3 | Assign to partner **+ team + territory + team lead** | server on submit | **Drifted (demo)** — the demo lead carried **only `partnerId`/`partnerName`**; team, territory, team-lead were never stamped | **Done** ⭐ | `attributionFor(partner)` derives **all four** server-side from the partner record on submit (`server.js`), never from the client. Seed leads back-filled idempotently via `normalizeLeads`. Admin lead detail renders the four-way attribution block. Attribution is **preserved** on the lead as submitted (transfer-time reassignment left undefined → OQ #4). |
| 6.4.4 | Manager: status, follow-up notes, assigned rep, next action — internal | F02/F03 `pipeline.js`; demo admin | **Done (CRM) / Partial (demo)** | **Done** | CRM already had status flow + internal notes + owner reassignment, all `internal:true` and audited. Demo enforces `lead.manage` (Super Admin/Manager) on status + internal-note; a Finance/Legal role is **403** (verified). Follow-up notes stay in `internalNotes`; assigned-rep/next-action are modelled in the CRM (`owner`) and logged as a demo-model gap (OQ #3). |
| 6.4.5 | Partner sees the **six** simplified states, nothing internal | P30 `lead-detail`; demo partner + server | **Partial (demo)** — static P30 + CRM had a real projection; the **demo partner app rendered the raw lead** (internal status names `new`/`rejected`, and `/api/state` + SSE shipped `internalNotes` over the wire) | **Done** ⭐⭐ | Added `partnerView(lead)` in `server.js`: maps internal status → the six partner states and **strips** internalNotes, owner, rep, next-action. Partner fetches `GET /api/state?as=partner` (leads pre-projected, own leads only); `lead.status`/`lead.converted` SSE now broadcast the **projection**, so a just-added internal note **never crosses the wire**. Partner pills relabelled to the six official states (Submitted…Closed — never "New"/"Rejected"). |
| 6.4.6 | Commission created **only** after sales verifies conversion | F04 `pipeline.js`; demo `verify-conversion` | **Done** | **Done (verified)** | `POST /api/leads/verify-conversion` is the **sole** creator of commission eligibility, gated `lead.convert` = [Super Admin, Manager] (Finance = **403**, verified). It creates a commission in **`pending`** with `amountBdt: null` (Finance sets the amount in Part 6). The partner app has **no** verify path and cannot self-verify. |

## The wall — `partnerView(lead)` (the backbone, Step 4)

The one projection every partner-facing render must pass through. Server-authoritative in the demo,
mirrored on the static surfaces.

```
PARTNER_STATUS = { new→submitted, contacted→contacted, meeting_scheduled→meeting_scheduled,
                   visit_completed→visit_completed, converted→converted, rejected→closed }
partnerView(lead) ⇒ { id, partnerId, prospectName, phone, projectId/Name, notes(own),
                      status(raw, for math), partnerStatus, createdAt, timeline, commissionId,
                      consent:{attested,at} }
   ABSENT by construction: internalNotes · owner/assignedRep · nextAction · four-way attribution · stall reason
```

**Proof of the wall (Step 4 demo):** the admin lead detail carries a **"📱 What the partner sees (P30)"**
panel that renders `partnerView` of the same lead. A manager adds an internal note above, glances at
the panel, and confirms it never appears — the single most important integrity demonstration in the module.
Enforced two ways in the demo: (1) `/api/state?as=partner` projects at the source; (2) partner-facing SSE
carries the projection only. Verified by test: partner-scoped state exposes **zero** internal fields; admin
state retains them.

## Conversion is the only commission trigger (the backbone, Step 5)

```
partner submits → staff work (lead.manage) → staff VERIFY conversion (lead.convert)
   → commission { status:'pending', amountBdt:null } → (Finance approves amount, Part 6) → partner sees Approved
```

- `lead.convert` / `lead.manage` = **[Super Admin, Manager]** only. Finance Officer and Legal are **403** (verified live).
- Partner app exposes **no** conversion path; a partner cannot mark its own lead Converted or trigger commission.
- What *counts* as conversion (booking-confirmed vs first-payment vs lead-marked-converted) is **undefined and recurring** across Parts 4 & 6 — logged as OQ #1.

## Demo ripples (Handoff C — each audited, no refresh)

- **Partner → Admin:** submit (with consent) → lands in F01 queue attributed to all four; toast *"New lead: {name}, interested in {project}, from {partner}."*
- **Admin → Partner:** advance status → P30 timeline advances; add internal note → **nothing** changes partner-side (the negative, proven by the panel); verify conversion → partner sees **Converted** + a Pending commission; (Finance approves) → approved balance rises.

## Cross-surface notes (honest)

- **Projection is mirrored, not shared.** `server.js partnerView` (authoritative), `partner-sales.js STATUS` (static P30), and `pipeline-data.js PARTNER_PROJECTION`/`partnerStatusOf` (CRM F02) encode the **same** six-state map in three files because the prototypes are separate. Unifying to one server-owned projection is a merge-time task (OQ, consistent with 6.1/6.5).
- **The demo runs a single global session** (one `staffId` + one `partnerId`). The `lead.convert`/`lead.manage` gates are real (role-checked, 403 on a wrong role), but a true "partner with no staff privileges" cannot be simulated through the shared session — in production the partner's own token carries no staff role. The product rule is correctly implemented; the limitation is the demo's session model, not the design.
- **`assignedRep` / `nextAction` as discrete fields** live in the CRM (`owner`) but not yet in the demo lead model (demo uses `internalNotes` for follow-up). Logged (OQ #3) — the manager's full internal status set is also richer than the partner's six (CRM `INTERNAL_STATUS` has 10 states projecting down to 6).

## Done-when checklist

- [x] All six clauses mapped with the diff; gaps closed on the connected surface
- [x] P28 consent is mandatory · explicit · un-pre-ticked · unskippable · **recorded with timestamp**, visible on the admin lead detail
- [x] All **four** attributions stamped automatically on submission (partner · team · territory · team lead), seed leads back-filled
- [x] Managers control status / follow-up notes / (owner) — internal, gated, audited
- [x] `partnerView(lead)` strips everything internal; the partner sees exactly the six states
- [x] The **"what the partner sees" panel** proves the wall — internal notes never appear
- [x] Conversion verification is the **sole** commission trigger, gated to Manager/Super Admin, creates a **Pending** commission; partner cannot self-verify (403 verified)
- [x] The full loop connects both directions with no refresh — Handoff C
- [x] Realtor UX — fast Bengali-first submission, draft-and-retry, glanceable six-state pipeline, consequential verification
- [x] Every lead action audited (create/status/note/convert)
- [x] All 8 open questions logged (`demo/OPEN_QUESTIONS.md`, Req 6.4 section)

_Last reconciled at the end of this pass — every "After = Done" is backed by a real code change in the listed file, verified against a booted server instance._
