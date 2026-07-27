# Alignment — Secure Project, Legal & Customer Document Repository (Req 6.7)

> **Filename note:** the repo's `ALIGNMENT.md` is being written by a concurrent pass on
> another requirement (it read as 6.5 during this build). To avoid clobbering a peer's
> in-progress file, this 6.7 audit lives in `ALIGNMENT-6.7.md`. Rename to `ALIGNMENT.md`
> if you want it as the canonical one.

Build-and-align pass. Status found by **inspecting the real code**, then built. This
module's value is not its UI — it's that every file is encrypted, access-controlled,
audit-logged, malware-scanned, versioned and retained. The security clauses were
**modelled with production shape even where mocked**, so the real build is a fill-in
(swap the mock scanner / bucket / backup) rather than a redesign.

Surfaces & where it lives:
- **Live demo (the enforcement point)** — `demo/server.js` holds the model + all
  server-side gates; `demo/public/{admin,client,partner}/app.js` are the three views;
  `demo/data.seed.json` seeds the Bangladeshi document set.
- **Static prototype (UI reference only)** — `crm-prototype/screens/N01–N06`
  (repository, detail, upload, change-visibility, version-history, access-log) and
  `C04–C05` (KYC). HTML mockups that **cannot enforce** anything; the compliance
  machinery necessarily lives in the connected demo.

> **Enforcement is server-side.** `canAccessDocument(actor, doc)` in `demo/server.js`
> is the single authority (classification × role × relationship, default-deny). The
> three frontends mirror it client-side for what they *render*, but a file's bytes are
> reachable **only** through the signed-link flow, which re-checks access on delivery.

## Clause status (after this pass)

| # | Clause | Before | After | What changed |
|---|--------|--------|-------|--------------|
| 6.7.1 | Legal users upload/classify project docs (deed/dolil, mutation/porcha, land-tax/khajna, RAJUK, plans, NOCs, agreements) | **Partial** — 3 flat docs, no BD types, `visibility` string only | **Done** | Configurable **document-type registry** (`defaultDocRegistry()`), each type tagged family + default classification + **per-type uploader roles** + allowed ext/size + retention. Legal types carry Bengali terms (দলিল/পর্চা/খাজনা/রাজউক). Upload authorisation is per-type. |
| 6.7.2 | Sales/Ops upload customer docs (NID/passport, photo, nominee, booking form, payment proof, receipts, correspondence) | **Partial** | **Done** | Customer family in the registry; uploader roles = Manager (Sales/Ops) + Finance for payment/receipt. Seeded real customer docs for Farhan Rahman (NID, booking form, payment proof, receipt) + a second customer to prove isolation. |
| 6.7.3 | Link each file to project / inventory / lead / customer / booking / investment / payment | **Missing** — only `projectId` | **Done** | **Polymorphic linkage** (`documentableType` + `documentableId` + `documentableLabel`), resolved by `resolveLinkage()`. Visible from both sides: the doc detail shows what it links to; entity screens can filter by their linked docs. Upload picks any project/customer/lead/booking. |
| 6.7.4 | Four-level classification (Internal / Legal-Finance / Partner-Visible / Customer-Lead-Restricted) | **Partial** — 3-value `visibility` | **Done** | `DOC_CLASSIFICATIONS` enum enforced by `canAccessDocument`. **Default-deny**: an unrecognised/absent classification collapses to `internalOnly`. `normalizeDocs` maps legacy `visibility` → classification. |
| 6.7.5 | Private encrypted bucket, no permanent public URLs | **Missing** | **Done (modelled)** | Files carry a private `storageKey` (`s3://salmon-secure-docs/…`, SSE-modelled). **No static document path exists** — `express.static` serves only `public/`, which contains zero document files (grep-proven). The single serving route is `GET /api/documents/file/:token`. |
| 6.7.6 | Time-limited signed links + audit of upload/view/download/update/delete | **Partial** — quiet download log | **Done** | `issueSignedUrl()` mints a random token with a short TTL (`signedUrlTtlSec` = 300s, 45s fast-mode), issued **only after** `canAccessDocument` passes; `/file/:token` re-checks access and 410s when expired. **Every** upload/view/download/reclassify/verify/version/publish/archive/delete writes to `accessLog` via `logAccess(…, action)` — **viewing included**, and denied attempts too. |
| 6.7.7 | Validate type/size, malware scan, quarantine unsafe files | **Missing** | **Done (modelled)** | Upload validates extension + size against the registry, then enters `uploading → scanning → clean / quarantined / rejected` (`scanDocument()`, mock signature match on "eicar/malware/…"). A non-`clean` file is **unreachable** — `canAccessDocument` rejects it before any link is issued. |
| 6.7.8 | Metadata, verification/publication status, version history (superseded retained) | **Partial** | **Done** | Full metadata (uploader/role/date, type, classification, linked entity, storageKey, mime, retention). `verificationStatus` ∈ {uploaded, underReview, verified, rejected, superseded}. `/version` supersedes: old kept, `isCurrent=false`, marked `superseded`; current is what users see; prior versions viewable in history. Nothing silently overwritten. |
| 6.7.9 | Configurable retention, archive, soft-delete, encrypted backup/restore | **Missing** | **Done (modelled)** | Per-type `retentionYears` (config-driven, editable via `/retention`) → computed `retentionUntil`. `/archive` (out of active view, retained). `/delete` is **soft only** — record + audit trail kept, never hard-deleted. Encrypted backup/restore acknowledged as a documented procedure (infra out of prototype scope). |
| 6.7.10 | Partners see only published legal *summaries*; sensitive customer docs restricted by default | **Partial** | **Done** | Partner branch of `canAccessDocument`: `partnerVisible` **and** `publishedToPartner` **and** (optionally) published-to-this-partner — legal *summaries* only. Customer docs are `customerLeadRestricted` and can **never** be published to partners (`/publish` rejects customer-family). Default-deny holds. |
| 6.7.11 | Record Salmon's legal-team status; system does NOT verify authenticity or process registration | **Partial** | **Done** | `/verify` attributes the decision to the human officer (`verifiedBy` + role + date). The detail UI states plainly: *"a Salmon legal officer marked it verified — the system records that human decision; it does not validate the deed's legal authenticity and does not process registration."* No land-registry / RAJUK-DB integration exists or is implied. |

## The access model (the requirement) — `canAccessDocument(actor, doc)`

Combines **classification × role × relationship**, server-side, default-deny:

- **Safety gate first** — any doc not `scanStatus:'clean'` (or `lifecycleStatus:'deleted'`) is unreachable by everyone.
- **Staff** — Super Admin: all. `internalOnly`/`partnerVisible`: any staff. `legalFinanceRestricted`: Legal or Finance. `customerLeadRestricted`: Legal / Finance / Manager (authorised staff).
- **Partner** — only `partnerVisible` **and** `publishedToPartner` (+ per-partner list if set). Never customer or raw legal docs.
- **Client** — only `customerLeadRestricted` that **concerns them** (their `customerId`, their `leadId`, their booking) — a role gate is not enough; relationship is required. Plus general collateral explicitly flagged `sharedToAllClients` (e.g. the buyer handbook).

Verified by an isolated test run (9/9 access cases + signed-link gate + scan pipeline + validation + authz + lifecycle):

```
Legal → legalFinanceRestricted      OK (signed link, 300s)
Manager → legalFinanceRestricted    DENIED — Manager is not Legal or Finance
Manager → customerLeadRestricted    OK
Partner → partnerVisible published  OK
Partner → customerLeadRestricted    DENIED — sensitive, restricted by default
Client(Farhan) → own NID            OK
Client(Farhan) → another customer   DENIED — concerns another customer
Anyone → quarantined file           DENIED — not cleared by malware scan
signed /file/:token valid           HTTP 200 (+ "Viewing logged"), bogus → 404
malware-named upload                 scanning → quarantined → unreachable
wrong ext / oversize / wrong role    400 / 400 / 403
version / archive / soft-delete      old retained · out-of-view · trail kept
```

## What NOT to do — checked

- [x] **No permanent public URL** — grep: `express.static` serves only `public/` (no document files); the sole doc route is `GET /api/documents/file/:token`, token-gated + expiring + access-re-checked.
- [x] **Default-deny** — unknown/absent classification → `internalOnly`; never defaults to visible.
- [x] **Partners never see raw customer docs** — summaries only, `/publish` blocks customer-family.
- [x] **Customers never see another customer's docs** — relationship-scoped, not just role-scoped.
- [x] **Verification is a human decision, attributed** — never presented as system legal validation; scope disclaimer in UI.
- [x] **No hard-delete** — soft-delete retains record + audit trail.
- [x] **Unscanned/quarantined files unreachable** — safety gate in `canAccessDocument`.
- [x] **Document types not hardcoded** — configurable registry, extensible, retention editable.
- [x] **Working UI not rebuilt** — the model was added beneath the existing sales-kit / client-docs surfaces.

## Honest notes / carried-forward

- **Metadata vs bytes.** The demo's single shared store means `/api/state` returns all
  document *metadata* to every browser; the frontends filter what they render, and the
  **file bytes are fully gated** (the deliverable). In the Laravel/React build each
  surface queries a scoped endpoint so metadata is scoped too — flagged, not faked.
- **Mocked infra (correct shape).** The malware scanner (signature-match stub), the
  encrypted bucket (`storageKey` + a mock file page), and encrypted backup/restore are
  modelled as real states/procedures with real gates. Production swaps the
  implementations without touching the access model.
- **Static prototypes** (`crm-prototype/screens/N01–N06`) remain UI reference; not wired
  to the enforcement layer, not the source of truth for behaviour.
- **To see it live:** restart `demo/server.js` (the running instance holds pre-6.7 code),
  then click **Reset** in the top bar to load the new seed (17 documents). `normalizeDocs`
  also upgrades any legacy `data.json` in place.

## Done-when checklist

- [x] All eleven clauses mapped with the diff
- [x] Document-type registry with real BD legal types (dolil/porcha/khajna/RAJUK/NOC) + customer types, configurable, per-type default classification + upload authorisation + retention
- [x] Polymorphic linkage across project/unit/lead/customer/booking/investment/payment, visible both sides
- [x] Four-level classification enforced by `canAccessDocument` (classification × role × relationship); default-deny holds
- [x] No permanent public URL — grep-proven; every access via a signed, expiring, permission-gated link
- [x] Every upload/view/download/update/delete audited, viewing included
- [x] Safety pipeline gates access — uploading → scanning → clean/quarantined/rejected; non-clean unreachable
- [x] Version history retains superseded files without showing them as current
- [x] Verification attributed to a human; app explicitly does not verify authenticity or process registration
- [x] Retention/archive/soft-delete modelled, nothing hard-deleted, backup acknowledged
- [x] Realtor-clean UX on all surfaces; access log prominent
- [x] 10 open questions logged (`demo/OPEN_QUESTIONS.md`)
