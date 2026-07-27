# Alignment — Partner Registration Flow (program-specific) + Logout + Dashboard (fix pass)

Reconcile-and-close-gaps pass over the four concrete gaps in the fix prompt. Status found by
**inspecting the real code** across the three surfaces, then patched. This did **not** rebuild the
working approval queue or the status wall — it wired the missing branch, the missing menus, and the
missing dashboard facts.

Surfaces:
- **Partner mobile** — `app/partner/*.page.html` + `app/assets/js/{partner-state,partner-sales,program-info,session}.js`
- **Admin panel** — `crm-prototype/` module engines + `assets/js/{components,people}.js`
- **Client mobile** — `app/client/*.page.html` + `app/shared/profile.page.html`

---

## Gap 1 — Program-specific registration paths (the branch point)

**Before:** `p04-program` (select zero / with / both) went straight to `p05-consent`. One generic
path — the program-info screens (`program-zero`, `program-with`) and the eligibility acknowledgment
existed only as post-approval reference pages, not in the registration journey.

**After:** each program takes its **own** registration path, branched at `p04`:

| Program | Path |
|---------|------|
| **Zero** | `p04` → **REG04a** `reg-program-zero` (light, "open to all", straight-through) → `p05-consent` |
| **With** | `p04` → **REG04b** `reg-program-with` (six sections + **MANDATORY** disclaimer + **REG05b** eligibility acknowledgment gate) → `p05-consent` |
| **Both** | `p04` → REG04a → REG04b → `p05-consent` (Zero directly, WI awaits activation) |

- **New files:** `app/partner/reg-program-zero.page.html`, `app/partner/reg-program-with.page.html`.
  Both reuse the shared six-section `ProgramInfo.render()` renderer, so the two read as variants of
  one design — never two designs.
- **REG04b is genuinely gated:** the "Continue to consent" button is **disabled** until the applicant
  ticks *"I understand With Investment participation is not automatic — it awaits admin activation"*
  (`draft.withEligAck`). This sets the expectation that WI is admin-approved (Req 6.3 / the 6.1 gate).
- **Disclaimer discipline held:** frequency + higher-tier commission appear only as
  `[CLIENT-APPROVED COPY REQUIRED]` / `[LEGAL SIGN-OFF REQUIRED]` markers. No rate, amount, guarantee,
  projection, or adviser framing (grep-clean, matching the 6.3.4 rule).
- **Consent branches correctly:** `p05-consent` already captured the four affirmative acceptances
  (terms · privacy · program · data-handling undertaking) + the WI disclaimer acceptance when the
  program is `with`/`both`. Its **back** link now returns to the program-specific info screen the
  applicant came through, so the branch is reversible.
- **`p06-referral` → submit → `partner-status`** (the wall) is unchanged and still connects into the
  admin queue.

## Gap 2 — The admin registration/approval module (verified present, program-aware)

The "missing panel side" was already built in `crm-prototype` (`people.js`). Verified against
PADM01–PADM07 and left intact — the fix **connects into** it rather than rebuilding it:

| Prompt | Where it lives | Status |
|--------|----------------|--------|
| **PADM01** Applications queue | `SCREENS.B02` | ✅ sortable by age; filters by **program / territory / referral source / date** |
| **PADM02** Application detail | `SCREENS.B03` + `consentCard()` | ✅ full profile + the **four consent acceptances with timestamps + versions** |
| **PADM03** Approve — Zero | `approveApplication()` | ✅ Partner ID shown before confirm, territory editable, rank Silver default, note → approve + ripple |
| **PADM04** Approve + activate WI | `participationCard()` / `programAction()` | ✅ **separate** per-program activation, `ACTIVATE_WITH_INVESTMENT` Super-Admin gate — the eligibility gate |
| **PADM05** Reject | `rejectApplication()` | ✅ **required reason**, shown verbatim on REG09 |
| **PADM06** Hold | `holdApplication()` | ✅ reason, awaiting info |
| **PADM07** Bulk approve | `bulkApprove()` | ✅ Zero-only batches, one audit entry per partner, cap 20 |

- **Per-program participation is modelled, not one flag:** `participation.{zero,with}` each carry
  `status` (`notEnrolled / active / suspended / closed`), enrolment date, reason, history — distinct
  from the partner's account status. Approving a partner can set Zero `active` while WI stays pending
  activation (two decisions). Confirmed unchanged.
- Every decision is a ConfirmDialog + `Audit.audit()` (old→new) + `Ripples.emit()` to the phone.

## Gap 3 — Logout on every authenticated surface

**Before:** the partner app had logout in several places, the client had it on the Profile tab, but
the **admin module screens** (`screens/*.html`, driven by 8 engines) had a `.user` avatar with **no
menu** — no way to sign out from inside a module. The mobile logouts were plain links (no confirm,
no session clear).

**After:**
- **Admin panel** — one shared, delegated **user menu** added to `components.js` (`openUserMenu` +
  a document-level `.user` click handler). Every module engine (people, catalogue, commission,
  connect, content, finance, invest, pipeline) now gets the same account dropdown with **My account ·
  Preferences · Log out**. Logout **confirms** → clears the mock session (`sessionStorage.crm_authed`)
  → **revokes** the mock device token (`localStorage.crm_device_token`) → returns to the sign-in wall
  (`../index.html`, which boots to `showLogin()`), with a `SIGN_OUT` audit entry. The console
  (`app.js`) keeps its own `#user` menu — the delegated handler no-ops there (`if (root.App) return`).
- **Partner + client mobile** — new dependency-free `app/assets/js/session.js` (`Session.logout()`):
  a bottom-sheet **confirm** → clears mock session/draft + **revokes** device token → returns to the
  unified entry **G02** (`shared/g02-welcome.page.html`). Wired into partner `profile`, `security`,
  `partner-identity`, `partner-status`, and the shared client `profile`.

## Gap 4 — Dashboard alignment to Req 6.2 (three-tier hierarchy kept)

**Before:** the redesigned three-tier dashboard held the hierarchy but was missing several 6.2 facts:
only 2 of the five earnings facts, no settled amount, no investment-return, no support-ticket status,
no training count, no ambient updates surface, and 4 shortcuts (not six).

**After** — all of 6.2 now present, hierarchy intact (verified by screenshot):

- **Tier 1 hero** — approved commission stays the **one** big number (spendable). **Verified sales**
  is the context line; **pending settlement · settled · investment-return** are subordinate chips.
  Investment-return shows `—` for Zero-only partners (layout-stable) and a `[LEGAL SIGN-OFF]` marker
  for active WI partners — never a figure.
- **Tier 2** — target bar + **status counts**: submitted leads · meetings · open tasks ·
  **support-ticket status** · **training items**.
- **Tier 3** — ambient **Recent updates** (notifications / project & inventory updates / status
  changes) from `PartnerSales.signals`.
- **Six shortcuts** in a fixed 2-col grid, **no horizontal scroll**: submit lead · booking record ·
  request meeting/visit · sales kit · raise ticket · submit settlement request.
- Data added to `partner-sales.js` (`dashboard` + `emptyDashboard`): `verifiedSalesVolumeBdt`,
  `settledBdt`, `investmentReturnBdt` (null → `—`), `submittedLeads`, `openTickets` + status,
  `trainingItems`. All remain **backend display values** — nothing computed in the app.

---

## Ripples verified (both program paths)

- Zero applicant submits → B02 queue → approve → REG10 welcome, Partner ID + card, Zero `active`.
- WI applicant submits (WI-flagged, eligibility acknowledged) → queue → approve partner **then**
  activate WI (separate) → both active, WI features unlock.
- Both → Zero active on approval; WI active on activation.
- Reject → REG09 with the exact admin reason. Every step audited.

## What was deliberately NOT done

- Did **not** rebuild the approval queue, the status wall, or the program-info reference pages —
  reused and connected them.
- Did **not** write program/legal copy — markers stand where copy is owed.
- Did **not** auto-calculate rank or eligibility — admin-assigned / admin-activated.
- Did **not** collapse per-program participation into one status flag.

## Done-when checklist

- [x] Full applicant flow exists and is **program-branched** (REG04a light vs REG04b gated-with-disclaimer)
- [x] Admin approval module present & program-aware (PADM01–07), WI activation a **separate** admin decision
- [x] Per-program participation modelled, not one flag; 4-part consent visible with timestamps on PADM02
- [x] Logout on **every** authenticated surface — partner mobile, admin panel (all modules), client app —
      each confirms, clears session, revokes the mock token, returns to entry
- [x] Dashboard shows all of 6.2 in the three-tier hierarchy, returns-aware for WI partners, six shortcuts, no h-scroll
- [x] Every step ripples + audits; markers stand where copy is owed
- [x] All 8 open questions logged (`.claude-project/OPEN_QUESTIONS.md`)
