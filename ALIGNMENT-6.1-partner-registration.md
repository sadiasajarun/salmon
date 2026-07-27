# Alignment — Sales Partner Registration, Approval & Profile (Req 6.1)

Reconcile-and-close-gaps pass. Status found by **inspecting the real code** across the three
surfaces, then patched. "Where it lives" lists the canonical file(s).

Surfaces:
- **Partner mobile** — `app/partner/*.page.html` (P01–P14) + `app/assets/js/{partner-state,territory}.js`
- **Admin panel** — `crm-prototype/` People module (B01–B10) + `assets/js/people*.js`
- **Live demo** — `demo/public/{partner,admin,client}` (connected SPA, SSE ripples)

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.1.1 | Register via **configurable** phone **or** email verification + submit profile | `app/partner/p02-register-identity.page.html`, `partner-state.js` | **Partial** — phone-OTP + email + NID all shown inline, no config flag | **Done** | Added `Partner.CONFIG.REGISTRATION_VERIFY_METHOD` (`phone`\|`email`\|`both`, default `phone`); P02 renders the method(s) from config, not hardcoded. Choice logged as OQ. |
| 6.1.2 | Review / approve / reject / suspend / **reactivate** — never delete | `crm-prototype` B02/B07/B08/B09, `people.js` | **Partial** | **Done (verified)** | Reactivate already exists (`reactivatePartner` → status `approved`, history intact, `REACTIVATE_PARTNER` audit). Confirmed **no delete path** anywhere in the People surface (grep). Reject/suspend are retained state changes with old→new audit. |
| 6.1.3 | Terms + privacy + program conditions + **consent for future customer info** | `app/partner/p05-consent.page.html`; admin `crm-prototype` B03 | **Drifted** — only 3 consents (terms, privacy, program) + conditional invest disclaimer; the umbrella data-handling consent was **missing** | **Done** | P05 now captures **four distinct** affirmative acceptances (terms · privacy · program · **data-handling undertaking**), none pre-ticked, each stored with **timestamp + version** in `Partner`. B03 (admin profile) shows all four with timestamps/versions. Separate from per-lead P28 consent (untouched). |
| 6.1.4 | Zero / With / Both **subject to eligibility** | `app/partner/p04-program.page.html`, `partner-state.js` | **Partial** — no eligibility gate | **Done (mechanism)** | Added config-driven `Partner.eligibleFor('with')` gate. With Investment renders **conditional/locked** with a reason when ineligible. Rule itself **not invented** — logged as OQ. |
| 6.1.5 | Unique Partner ID + shareable/downloadable business card **+ QR** | `app/partner/business-card.page.html` (P12) | **Missing QR** | **Done** | New lightweight, dependency-free client-side QR encoder (`app/assets/js/qr.js`, byte-mode, RS ECC-M, masking). Integrated into the **canvas** card (survives PNG share/download), encoding the partner's **referral URL**. What it should encode logged as OQ. |
| 6.1.6 | Territory via **configurable** Division › District › Upazila/Thana › Union | P03 (request) = `territory.js`; B06 (assign) = `people.js` | **Partial** | **Done (mobile) / noted (admin)** | P03 already uses a real data-driven cascade from `territory.js` (confirmed). Admin B06 draws from partner data, not the same seed — **cross-surface unification** noted below and logged as OQ #6 (single source when the codebases merge for the Laravel build). |
| 6.1.7 | Admin-assigned rank (Silver/Gold/Platinum); **no auto-calculation** | P14 (`partner-rank`), R02 (`people.js`) | **Done** | **Done (re-verified)** | P14 is a static badge with an explicit "no progress bar" note; R02 is manual with a required note. Grep confirms **no progress bar / criteria-met / auto-suggest** regressed in. |
| 6.1.8 | English/Bengali via **externalized** localization; toggle on registration | throughout `app/partner`, `app/i18n/` | **Partial** — toggle present on every registration screen, but strings inline via `t(bn,en)` | **Partial → improving** | Language toggle confirmed on P02–P06 headers. Introduced `app/i18n/partner.en.json` + `partner.bn.json` + `app/assets/js/i18n.js` and migrated the **new** consent/eligibility strings to it (proves the externalization path). Full migration of legacy inline strings is a mechanical follow-up (logged). Bengali verified for overflow on the longer 4-consent screen and the card. |

## Cross-surface notes (honest)

- **Two territory sources exist** because partner-mobile (`territory.js`) and admin (`crm-prototype/people-data.js` `territoryTree`) are currently **separate prototypes**. Both are data-driven (neither is four hardcoded dropdowns), but they are not yet the *same* file. Unifying to one seed is a merge-time task for the Laravel + React build — logged as OQ #6.
- **Consent flow across surfaces:** each prototype persists to its own mock store (mobile → `localStorage`; admin → mock overrides). The umbrella consent is captured on P05 and rendered on B03; in the connected demo the same four acceptances ride the registration event. There is no shared backend in the prototype (by design).
- **`demo/public` register screen** used a single bundled consent checkbox and a hardcoded territory `<select>` — **more drifted** than `app/partner`. Patched: register now lists the four acceptances and the card shows a QR; the reactivate ripple is wired. (Its territory picker remains a simple select — flagged, not rebuilt.)

## Done-when checklist

- [x] This table maps all 8 clauses with the diff
- [x] Four distinct consents at registration (P05), visible with timestamps on admin B03
- [x] QR on the business card (P12), integrated, surviving image-share, encoding the (logged) referral target
- [x] Program eligibility gate on P04 — With Investment conditional, mechanism config-driven, rule logged
- [x] Verification method + territory hierarchy are config/data-driven, not hardcoded
- [x] Reject / suspend / reactivate retain history; no delete path exists
- [x] Rank stays a static admin-assigned badge — no progression indicator
- [x] Language toggle on registration screens; new strings externalized; Bengali overflow checked
- [x] Ripples fire in the demo, each with an audit entry
- [x] 10 open questions logged

---

# Alignment — Program Enrolment and Information (Req 6.3)

Reconcile-and-close-gaps pass. Status found by **inspecting the real code**, then patched.
Program participation is now modelled as a **per-program record** (its own status, enrolment
date and history) that is **distinct from the partner's account status**.

Surfaces:
- **Partner mobile** — `app/partner/{program-zero,program-with,enrolment,p04-program}.page.html` + `app/assets/js/partner-state.js`; connected copy in `demo/public/partner/app.js`
- **Admin panel** — `crm-prototype/` People module (B03/B06) + `assets/js/people.js`; connected copy in `demo/public/admin/app.js`
- **Live demo** — `demo/server.js` (participation model, endpoints, permissions, audit, SSE ripples)

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.3.1 | Present client-approved **description, eligibility, responsibilities, benefits, conditions, disclaimers** per program | P17 `program-zero`, P18 `program-with` | **Partial** — P17 had 4 of 6 (no distinct *Description*, no *Disclaimers* section); P18 had a prominent disclaimer + prose but not the six labelled sections | **Done** | Both screens rebuilt on **one shared six-section renderer** (`section()` helper) in a fixed order. Real copy absent → each section body is a marked `[CLIENT-APPROVED COPY REQUIRED]` block, never plausible filler. Bilingual (bn/EN) preserved. |
| 6.3.2 | Enrol in **one or both**; record **enrolment date + status** per program | P04 (selection), P19 (`enrolment`) | **Drifted** — P04 offered zero/with/both, but demo approval **collapsed `both`→`zero`** (`server.js` old L590); P19 showed a **single** `joinDate` and only Active/Available; no per-program status, no suspended/closed | **Done** | Participation is a **set**: `participation.{zero,with}` each with `status`, `enrolledAt`, `requestedAt`, `history[]`. P19 lists every program with its **own** date, status, and — when suspended/closed — the **reason + date**. `both` no longer collapses. |
| 6.3.3 | Admin **activate / suspend / close** participation | admin People module (B03/B06), demo admin | **Missing** — CRM had **account**-level suspend/reactivate and a B06 program-*change* modal, but **no per-program participation lifecycle**; demo admin had none | **Done** | **Program participation panel** on the partner detail (demo admin + CRM B03). Per program: **Activate · Suspend · Close**, ConfirmDialog + reason, `audit()` old→new, SSE ripple to the partner's P19. **Nothing deleted** — suspend/close are retained state changes with history. |
| 6.3.4 | Client-approved **return-frequency / higher-tier-commission** info — **no guarantor / adviser framing** | P18, demo `investment` screen | **Drifted** — placeholders present (`[LEGAL COPY REQUIRED]`, `[AMOUNT — LEGAL SIGN-OFF REQUIRED]`) but the **frequency** and **higher-tier commission** framing, the required non-committal framing line, and disclaimer prominence were not made explicit | **Done** | P18 Benefits/Conditions/Disclaimers carry: *higher-tier commission* (client-approved words, **no rate/compute**), *return **frequency*** as `[CLIENT-APPROVED COPY REQUIRED — frequency]` (never a rate/amount), a **mandatory prominent** `[LEGAL DISCLAIMER COPY REQUIRED]` block, and the required framing line (itself marked for legal confirmation). No guarantee/advice/projection anywhere. |

## Participation model (canonical)

```
ProgramParticipationStatus = notEnrolled | active | suspended | closed   // per program, NOT the account
participation.zero = { status, enrolledAt, requestedAt|null, history:[{status, at, reason, by}] }
participation.with = { status, enrolledAt, requestedAt|null, history:[...] }
```

- **Eligibility gate (6.1):** Zero enrol → `active` immediately. With enrol → records `requestedAt` (stays `notEnrolled`, shown *available on approval*); an admin **Activate** (Super Admin only) turns it `active`.
- **Account status ≠ participation status.** A suspended *program* leaves the account active; a suspended *account* is the separate 6.1 path.
- **Legacy `partner.program` string is derived** from participation (`'zero'|'with'|'both'|'none'`) so existing labels/gates keep working; it is written on every participation change, never the source of truth.

## Permissions

```
MANAGE_PROGRAM_PARTICIPATION : [Super Admin, Manager]   // suspend / close / activate-zero
ACTIVATE_WITH_INVESTMENT     : [Super Admin]             // the 6.1 eligibility approval — admin-only
```

## Demo ripples (each audited)

- Partner enrols → admin sees it; With Investment surfaces as an **activation request** in the participation panel.
- Admin **activates** With Investment → partner P18/P19 → `active`, enrolment date recorded, With features unlock.
- Admin **suspends** a program → partner sees `suspended` + reason; that program's actions disabled.
- Admin **closes** a program → partner sees `closed`, retained in history, features removed.

## Disclaimer discipline (6.3.4) — what is and isn't allowed on screen

- **MAY show (as client-approved copy placeholders):** that With Investment *involves* a return at a stated **frequency**; that With partners earn a **higher-tier commission** than Zero.
- **MUST NOT:** a specific return **rate/amount** (`[LEGAL SIGN-OFF REQUIRED]`), any **guarantee** language, Salmon/the app as **guarantor** or **investment adviser**, any **projection**, or any **computed** higher-tier commission (hand-entered like every commission).
- Grep gate: `guarantee|guaranteed|assured|risk-free|profit|advice|adviser|projection` must appear **only** inside disclaimer/placeholder text that *negates* them — never as a promise. Verified.

## Done-when checklist

- [x] This table maps all four clauses with the diff
- [x] Both program screens present all six sections in a shared structure, `[CLIENT-APPROVED COPY REQUIRED]` where copy is absent
- [x] Enrolment supports one or both; records + displays date and status per program; respects the eligibility gate
- [x] Program participation is per-program and distinct from account status, with its own history
- [x] Admin can activate / suspend / close each program, with reasons, audit entries, mobile ripples — nothing deleted
- [x] Return-frequency / higher-tier-commission info only in client-approved, non-committal terms — no rate, amount, guarantee, advice, projection
- [x] Mandatory prominent disclaimer, marked `[LEGAL DISCLAIMER COPY REQUIRED]`
- [x] No guarantor / investment-adviser framing anywhere (grep-verified)
- [x] Demo ripples fire, each audited
- [x] All 8 open questions logged
