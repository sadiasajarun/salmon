# OPEN_QUESTIONS — salmon-app

Per CLAUDE.md §12, these commercial rules are **not yet defined by the client**. Do NOT hardcode a
value. Implement the *mechanism* behind an interface + mock, and drive the value from the `/config`
endpoint or mock data. Resolve each with the client, then update here and in code config.

Status legend: 🔴 open · 🟡 assumption pending confirmation · 🟢 resolved

## Payments
- 🔴 Which gateways ship, and in which countries? (Stripe / PayPal / SSLCommerz / international wire / local MFS)
- 🔴 Token booking amount model: fixed / per-project / percentage? (prototype uses ৳500,000 placeholder)
- 🔴 Inventory lock duration (the booking countdown window)? (prototype uses 30 min placeholder)
- 🔴 Refund & cancellation policy?
- 🔴 Is display-currency conversion informational or transactional? Exchange-rate source + rounding rule?
- 🔴 Invoice numbering scheme, tax fields, and legal wording?
- 🔴 **What happens when the unit lock expires while a payment is still `pending`?** This needs a real
  answer from Salmon's **finance team**, not a design decision. (Prototype: keeps the payment under
  verification, tells the user the hold lapsed, and states Salmon will re-hold or refund — placeholder.)
- 🔴 Is the **transaction currency always BDT**, or does it vary by gateway?
- 🔴 **Wire reconciliation SLA** — how long does a wire stay `pending` before finance confirms?
- 🔴 Installment schedule rules — how many installments, what intervals, what late penalties?
- 🔴 Does any booking/payment action require **Verified KYC** first?

## Unified entry & role routing (front door G01–G06)
- 🔴 **Can one identity (phone/email) hold BOTH a client and a partner account, or must they be
  separate identifiers?** Changes the data model and the G05 resolver flow.
- 🔴 If both are allowed, is there an **in-app role switch**, and where does it live? (Prototype flags
  it for the shared Profile/account area.)
- 🔴 Does a partner **automatically get a client account** too (partners can buy), or are these opt-in
  separately?
- 🔴 On unified sign-in, is the **identifier email, phone, or either**?
- 🔴 Should the **welcome screen (G02) carry any marketing**, or go straight to the fork?

## Partner meetings, records & payout (Acts P6–P8)
- 🔴 **Minimum settlement amount** — is there a floor below which a partner can't request?
- 🔴 Settlement **hold / rejection / reversal** rules — what triggers each, and what can the partner do?
- 🔴 How does Salmon actually **pay a settlement** (so P46/P47 copy can describe it honestly) — bank,
  bKash, cash at office, agreed per-partner? (The app collects **no** bank/account details.)
- 🔴 Can a partner record a booking for **any** verified lead, or only leads they personally submitted?
- 🔴 Offline **payment-method categories** — the confirmed list (cash / bank transfer / cheque / MFS /
  other?). (A category only — never an account number.)
- 🔴 **Meeting provider** — Zoom, Meet, or Teams? (App attaches an external link; hosts no video.)
- 🔴 **Site-visit logistics** — does the app capture location/time, or just request and let the
  scheduler arrange?
- 🔴 What **partner-facing reference** is shown for a settled payout (for the partner's own records)?
- 🔴 **Recurring head-office meeting** — cadence, attendance rules, consequences of missing it?

## Partner workbench, sales kit & leads (Acts P3–P5)
- 🔴 What event officially counts as a **"conversion,"** and exactly who is authorised to declare it?
  (The app never lets a partner self-serve a conversion.)
- 🔴 **Target/achievement** — how is a partner's target set, and over what period? (No projection/
  forecast is shown — the app displays only backend values.)
- 🔴 Which **sales-kit content is gated**, by which attribute (program / rank / team / territory), and
  by what rule? (Gating is server-side; the app only reflects locked-with-reason.)
- 🔴 **Lead fields** — the full required set, and which are optional.
- 🔴 **Consent** — is a checkbox sufficient for Salmon's data-protection obligations, or is
  recorded/explicit consent capture required? *(Legal check — this is the app's liability shield.)*
- 🔴 Is `Submitted → Contacted → Meeting scheduled → Visit completed → Converted / Closed` the
  confirmed **partner-facing status list**?
- 🔴 Can a partner **edit or withdraw** a submitted lead, or is it immutable once sent?
- 🔴 Does the partner see the buyer's **contact details after submission**, or only the status?

## Partner onboarding & identity (Acts P1–P2)
- 🔴 Exact **Partner ID format** (prototype uses `SDP-CUM-00417` placeholder)?
- 🔴 Required **registration fields** — the full list (P02/P03 fields are placeholders)?
- 🔴 Registration **verification method** — phone, email, NID, or a combination?
- 🔴 **Approval workflow** — who approves, how many steps, and the **review SLA** (P07 shows a
  `48h` placeholder and needs a real number)?
- 🔴 **Rejection reasons** — a fixed set, or free text?
- 🔴 **Suspension triggers** and the reactivation path?
- 🔴 **Rank criteria** — even though assigned manually, what are the rules? **Should rank show
  progression, and by what rule?** (P14 deliberately shows NO progress bar until this is answered.)
- 🔴 **Territory structure** — is Division › District › Upazila/Thana › Union correct and complete?
  (Only Chattogram › Cumilla is fully populated in the prototype cascade.)
- 🔴 **Referral code** format and what it binds — team only, or team + territory?
- 🔴 **Business-card fields** — exactly what appears, and is there an approved template?

## Partner program
- 🔴 Partner ID format?
- 🔴 Required registration fields; approval steps and approver identity?
- 🔴 Silver / Gold / Platinum criteria (assigned manually — but on what basis)?
- 🔴 What event counts as a "conversion", and who declares it?
- 🔴 Zero-Investment commission rates?
- 🔴 With-Investment higher-tier rate, eligibility, and trigger?
- 🔴 Legally approved return terms and disclosure wording? **(blocked on legal counsel, not product)**
- 🔴 Minimum settlement amount; hold / rejection / reversal rules?

## Client app
- 🔴 Does any action require Verified KYC (e.g. booking, payment)?
- 🔴 Chat: WhatsApp Business API vs in-app provider? (pick ONE, behind `SupportChannel`)
- 🔴 Maps: Google Maps vs Mapbox? (behind `MapProvider`)
- 🔴 Meetings: Zoom vs Google Meet link?
- 🔴 Consultation slot availability + cancellation rules?

## Client-supplied assets & accounts (blocking inputs, not engineering)
- 🔴 Project coordinates, unit configs, pricing, HD media, 360/Matterport assets, floor plans, construction content.
- 🔴 Accounts: Apple Developer, Play Console, gateway merchant accounts, map API key, CDN, chat provider, OTP provider.

---

## Act 2 — Discovery data (fabricated values to confirm with Salmon)

Real project data (names, statuses, addresses, taglines, At-A-Glance specs, image/brochure/video
URLs) was fetched from `salmondevelopersbd.com`. The following were **not on the site** and are
**fabricated** in `assets/js/mock-data.js` (flagged `__PLACEHOLDER` / `_ph`). Confirm each:

- 🔴 **Brand colour discrepancy** — the live website's theme is olive/gold `#8e8a1f`, but the
  proposal + CLAUDE.md §10 specify **maroon `#800020`**. The prototype follows the proposal (maroon).
  **Which is the real brand?**
- 🔴 **Prices** — no prices on the site. Fabricated BDT figures from area × sqft rates
  (Basundhara ৳13k/sqft, Banasree ৳10k, Rampura ৳8.5k, Badda ৳8k, Sanarpar/Tusar Dhara ৳6.5k).
  Confirm real price list per project/unit.
- 🔴 **Display-currency rate + rounding** — AED/USD/GBP shown at an **indicative placeholder rate**
  (1 BDT = 0.0362 AED) with placeholder rounding (nearest 1,000). Confirm rate **source**, **as-of
  cadence**, and **rounding policy**. (BDT is always shown alongside — never a lone display figure.)
- 🔴 **Map coordinates** — no coordinates on the site. Pins are placed at approximate neighbourhood
  centroids with small offsets. Confirm real lat/lng per project.
- 🔴 **Unit inventory** — no unit-by-unit data on the site. Generated a unit list per project from the
  real flat count, with fabricated Available/Reserved/Booked/Sold statuses. Confirm real inventory.
- 🔴 **Project status buckets** — site uses "Sale Ongoing / Under Construction / Handed Over". Mapped
  to the app's ongoing/completed/upcoming (Handed Over → completed; the two list-only projects →
  upcoming). Confirm mapping and the ongoing/completed/upcoming spread.
- 🔴 **Construction timeline** — fabricated dated entries for ongoing projects, anchored on real blog
  events (Florentine soil test Aug 2025 + land registration Jul 2025; US Tower soil test Jul 2025).
  Confirm real progress logs + photos.
- 🔴 **360°/Matterport assets** — none published. Using a public-domain equirectangular panorama as a
  clearly-labelled stand-in behind a swappable seam. Provide real Matterport/360 assets.
- 🔴 **Floor-plan files** — none published. The floor-plan viewer shows a labelled placeholder
  schematic (with indicative room/balcony dimensions) behind a swappable seam. Provide real per-unit
  floor-plan images.
- 🔴 **Construction progress photos** — the timeline uses gallery images as indicative stand-ins.
  Provide real dated site photos per milestone.
- 🔴 **Missing brochures/videos** — Orchard, US Tower, Shopno Neer, Tabuk Tower have no/broken
  brochure PDF on the site; Lake View has no intro video. Provide the missing files.
- 🔴 **List-only projects** — Salmon Sweet Melody & Salmon Villa Lone have no detail page; all specs
  are unknown/fabricated. Provide full project data.
- 🔴 **Civic amenities / neighbourhood** — not on Salmon's site. The project-detail "Neighbourhood"
  section (nearby schools, hospitals, transport, markets) uses **plausible-but-unverified** Dhaka
  landmarks per area, flagged. Provide the real per-project neighbourhood data (or leave empty — the
  section only renders when data exists).
- 🔴 **Site-visit / virtual-walkthrough scheduling** — "Arrange a visit" routes into the consultation
  slot flow; the exact site-visit request workflow and lead times are undefined.

---

## Act 5 & 6 — the long relationship (confirm with Salmon)

- 🔴 **Chat provider: WhatsApp Business API vs managed in-app chat?** *This changes the product, not
  just the code* — with WhatsApp the conversation lives on Meta and we keep only a ticket reference +
  status (a stub, not a transcript). Built both behind a `SupportChannel` seam.
- 🔴 **Zoom vs Google Meet** for consultations? (behind a seam; the app only attaches a link)
- 🔴 Consultation **slot duration, buffer, and booking horizon**? (prototype: hourly, 10-day window)
- 🔴 Consultation **cancellation & reschedule window**?
- 🔴 Consultation **reminder lead time** — 24h, 1h, both?
- 🔴 **Relationship-manager assignment rule** — who gets whom?
- 🔴 **Support SLA** — what is promised, and in which timezone?
- 🔴 Does Salmon offer consultation slots **outside Dhaka business hours** for far-timezone clients
  (Toronto/Sydney), or is a call the only workaround?
- 🔴 Which **notifications are opt-out vs mandatory**?
- 🔴 (reaffirmed) Invoice numbering/tax/legal wording; installment count/intervals/penalties; wire
  reconciliation SLA — see Payments section above.

---

## Partner Act 9 — With Investment ⚠️ LEGAL BLOCKERS (not engineering)

> These are **legal deliverables from Salmon's counsel**, not decisions engineering can make or
> defaults engineering can pick. The module (P51–P56) is built as a **passive record-keeper only** —
> enquiry, staff-recorded investment record, a **status-only** return table, and a prominent
> disclaimer slot. It computes nothing, promises nothing, pays nothing. **It cannot ship until all
> four blockers below are resolved.** The prototype carries `[LEGAL COPY REQUIRED]` where the
> disclaimer text belongs and does not fabricate any terms.

- 🔴🚫 **With Investment commercial rules** — the full commercial + legal terms governing shares and
  returns. ⚠️ *Blocks the ENTIRE module.* No screen may imply any rule exists until this lands.
- 🔴🚫 **Return-schedule structure** — frequency, how entries are determined, and what `On hold` means
  operationally. (Prototype shows a hand-recorded `Paid / Pending / On hold` table only — no cadence
  is asserted.)
- 🔴🚫 **Higher-tier commission** — rate, eligibility, trigger, approver. Entered by hand on the web
  panel exactly like every other commission — the app performs **no commission maths**.
- 🔴🚫 **Disclaimer copy (P56)** — supplied by Salmon's legal counsel. ⚠️ *Cannot ship without it.*
  Placeholder is a clearly-marked `[LEGAL COPY REQUIRED — supplied by Salmon's counsel]` block.
- 🔴 **Eligibility for With Investment** — who is eligible, and how is that decided?

## Partner Acts 10–12 — team / tasks / system

- 🔴 **Team-lead permission boundary** — the exact list of what a lead may and may not see (roster
  fields, member detail depth, team-vs-district scope). *The whole point of Act 10.*
- 🔴 **Becoming a team lead** — how does a partner become one? (P62 currently a clean dead end.)
- 🔴 **Territory transfer** — what happens to a lead's team when members move between unions?
- 🔴 **Task assignment** — can team leads assign tasks, or only managers?
- 🔴 **Notice targeting** — the exact attributes (team / territory / rank / program) and their
  precedence when a partner matches more than one.
- 🔴 Which **partner notifications are mandatory vs opt-out**?

---
_Generated during `/fullstack-pm salmon-app` (P1-spec). Every item here is an intentional gap from
CLAUDE.md §12 — guessing any value is a defect. Act 2 added 2026-07-14; Act 5/6 added 2026-07-14;
Partner Act 9 legal blockers + Acts 10–12 added 2026-07-15._

---

## Req 6.1 — Sales Partner Registration, Approval & Profile (alignment pass, 2026-07-26)

Logged during the reconcile-and-close-gaps pass. See `ALIGNMENT.md` for the clause-by-clause diff.

1. 🔴 **Registration verification method** — phone, email, or both? Drives `REGISTRATION_VERIFY_METHOD`
   (default `phone`). Mechanism is config-driven; the choice is Salmon's.
2. 🔴 **Partner ID format** — confirm the `SDP-CUM-00417` shape and the territory-prefix rule.
3. 🔴 **Business-card QR target** — what should it encode: a referral URL, a vCard, the Partner ID, or an
   app deep link? *Recommend referral URL* (current: `https://salmon.example/r/<PartnerId>`). Needs Salmon.
4. 🔴 **With-Investment eligibility criteria** — what gates it? The **gate mechanism** is built
   (`Partner.eligibleFor('with')`); the **rule** is undefined. Needs Salmon.
5. 🔴 **Required registration profile fields** — the confirmed full list (currently name · phone/email ·
   NID · address · occupation · requested territory).
6. 🔴 **Territory hierarchy** — is Division › District › Upazila/Thana › Union final and complete, and who
   maintains the seed? Also: unify the two current sources (mobile `territory.js` + admin `territoryTree`)
   into one when the codebases merge for the Laravel build.
7. 🔴 **Consent versioning** — when terms/privacy/program change, must partners re-consent, and how is that
   surfaced? Acceptances are stored with `version` + `acceptedAt`; the re-consent trigger is undefined.
8. 🔴 **Reapplication after rejection** — same identity allowed, or must the applicant use a new
   number/email? (Records are retained; reapplication is possible.)
9. 🔴 **Rank criteria** — even though manual today, will rules eventually be defined, so the data model can
   anticipate? (No progression indicator is shown until then.)
10. 🔴 **Business-card branding** — is there an approved Salmon template/asset, or do we design it?

_Questions 3, 4 and 10 need Salmon before Req 6.1 can be called final._

---

## Req 6.8 — Team, Territory, Rank & Referral (alignment pass, 2026-07-26)

Most of this module already shipped (Part-2 D/R screens); this pass added the relationship view, create-team,
create-territory + stat/search enhancements. See `ALIGNMENT.md`.

1. 🔴 **In-flight leads on transfer** — when a partner moves team/territory, do open leads retain original
   attribution or reassign to the new team lead? The TR01 (D06) transfer **forces the choice and can log it
   undecided**; default shown is "leads retain original attribution".
2. 🔴 **Who gets a referral code** — all approved partners, or only team leads? Config decides (RF01/D07).
3. 🔴 **Referral code format & lifetime** — the format rule and whether codes expire or are permanent-until-
   deactivated (currently permanent-until-deactivated).
4. 🔴 **Territory hierarchy finality** — is Division › District › Upazila/Thana › Union final and complete,
   and who maintains the seed? TT03 adds nodes; the canonical data owner is undefined.
5. 🔴 **Rank criteria** — even though manual today (no automation, no progress bar), will rules eventually be
   defined so the data model can anticipate?
6. 🔴 **Team-lead demotion** — when the lead flag is removed, what happens to their roster and reports —
   reassign, orphan, or hold? (Currently the roster is left untouched.)
7. 🔴 **One team or many** — can a partner belong to more than one team, or exactly one? (Currently exactly one.)

**Also noted (mobile gap):** the prompt assumes a team-lead **Team section (P57–P62)** exists in the partner
app, but `app/partner` has no such screens (only `tasks.page.html` touches team content). The team-lead
**boundary** is a scope concept; the CRM has no `TEAM_LEAD` role (roles are Super Admin / Manager / Finance /
Legal), so scoping maps to the Part-1 team-lead-visibility question. Building the mobile P57–P62 Team section
is a follow-up.

---

## Global Client App — Req 6.19–6.25 (alignment pass, 2026-07-26)

Verification pass; the client app satisfies the numbered requirements. See `ALIGNMENT-CLIENT.md`. One drift
fixed (demo checkout fake card fields → hosted handoff). Client-facing open questions:

1. 🔴 **Exchange-rate source + rounding policy** (6.20) — presentation currency uses an approved rate + rounding; source (auto feed vs manual) undefined.
2. 🔴 **Invoice numbering / tax / legal wording** (6.23) — `[CLIENT-APPROVED COPY REQUIRED]`.
3. 🔴 **Chat provider** — WhatsApp Business vs in-app (6.24, also 6.16). Blocks the chat surface's final form.
4. 🔴 **Zoom vs Meet** (6.24) — consultation link provider (seam built, choice pending).
5. 🔴 **Does any client action require Verified KYC?** (6.19) — e.g. must KYC be Verified before booking, or only before completion?
6. 🔴 **Map provider** (6.20) — which mapping SDK/tiles for the discovery map.
7. 🔴 **Wire reconciliation SLA** (6.22) — the number the pending-wire age indicator warns against.
8. 🔴 **Lock expiry mid-payment** (6.22) — what happens when a unit lock expires while a payment is still pending? Needs a real finance answer, not an engineering guess.

---

## Partner Registration Flow (program-specific) + Logout + Dashboard — fix pass, 2026-07-26

Feeds the branched applicant journey (REG04a/REG04b) and the WI activation gate. See
`ALIGNMENT-registration-flow-fix.md`.

1. 🔴 **Verification method** — phone, email, or both at registration? Drives REG01. Mechanism is
   config-driven (`Partner.CONFIG.REGISTRATION_VERIFY_METHOD`); the client-approved choice is undefined.
2. 🔴 **With Investment eligibility criteria** — what actually gates WI activation (PADM04)? The gate is
   admin-approval as a mechanism; the *rule* an admin applies is undefined (recurring 6.1/6.3 question).
3. 🟡 **Independent Zero/WI approval** — can Zero be approved and active while WI is held for separate
   activation? Assumed **yes** (per-program participation is modelled independently) — confirm.
4. 🔴 **Partner ID format** — the minted ID (`SDP-<TERR>-NNNNN`) is a placeholder scheme; the canonical
   format is client-owned.
5. 🔴 **Business-card QR target** — what the card QR encodes (referral URL assumed). Unchanged from 6.1.
6. 🔴 **Registration required-field list** — the authoritative set of mandatory fields across REG01–REG02.
7. 🔴 **Investment-return display on dashboard** — for active WI partners the returns chip shows a
   `[LEGAL SIGN-OFF REQUIRED]` marker, never a figure; when/what may be shown is blocked on legal.
8. 🔴 **Logout token revocation** — prototype clears a mock device token + session locally; the real
   server-side revocation/session-policy (single-device vs all-devices) is undefined.
