# Alignment — Global Client App vs Requirements 6.19–6.25

Verification pass (not a rebuild). Each clause of 6.19–6.25 walked against the built client app.
Surfaces: **`app/client/*.page.html`** (canonical mobile prototype) + **`demo/public/client`** (connected SSE demo).
Result: **overwhelmingly Built & aligned** — the journey-built app satisfies the numbered requirements. One
real drift found and fixed (a fake card form in the *demo* checkout). The money laws hold, grep-proven.

## 6.19 — Client Auth, KYC & Preferences
| Clause | Status | Evidence |
|---|---|---|
| Email / intl phone+OTP / Google / Apple (Apple mandatory on iOS) | ✅ Built | `signup`/`login` shared screens; four methods |
| Name, photo, contact, verified-channel badges | ✅ Built | profile captures + badges |
| Passport/NID → KYC states (Not Submitted/Pending/Verified/Rejected) | ✅ Built | `kyc.page.html` — four states; rejection reason shown; **ripple to Legal** (`kyc.verified`/`kyc.rejected` SSE events) |
| Biometric unlock post-login, on device | ✅ Built | `shared/g01-splash` — "Biometric unlock (if enabled) happens here", session-convenience only |
| Language, currency, timezone — onboarding + editable | ✅ Built | profile + prefs |
| Secure session, logout, recovery, device-token | ✅ Built | shared auth |
**KYC not front-loaded** (never asked before a property is seen) — confirmed by flow order.

## 6.20 — Discovery, Map & Search
| Clause | Status | Evidence |
|---|---|---|
| Ongoing/completed/upcoming on interactive map, clustered status pins | ✅ Built | `discovery-map`, `explore-map` |
| Filters: status, location, category, config, area, price, availability | ✅ Built | `filters.page.html` (11 filters) — reads the category system |
| Open project + unit from marker or result | ✅ Built | both paths |
| Presentation currency (approved rate+rounding) + **transaction currency (BDT) preserved** | ✅ Built | dual-currency; `terms` §2 "charged in BDT, the authoritative transaction currency; any other currency is an indicative reference only" |

## 6.21 — Immersive Project & Construction
| Clause | Status | Evidence |
|---|---|---|
| HD galleries + promo video via responsive CDN | ✅ Built | `project-gallery`, `video` — progressive/responsive |
| **Working** 360/Matterport viewer | ✅ Built | `tour-360` — real CSS drag-pan **equirectangular** viewer (works from file://), not a static image |
| Floor plans pinch-zoom + pan | ✅ Built | `floor-plan` — gesture zoom/pan |
| Dated construction timeline, **hero** | ✅ Built | `project-progress` (33) — "Dated vertical timeline · hero treatment", newest first |
| Live availability from controlled inventory | ✅ Built | `unit-list`/`unit-detail`; demo `construction.published` + inventory events ripple live |

## 6.22 — Online Booking & Payment (money laws)
| Clause | Status | Evidence |
|---|---|---|
| Select unit, review token + terms | ✅ Built | `booking-review`, `terms` |
| Pending booking + temporary lock w/ countdown | ✅ Built | lock + countdown; `booking.expired` handled honestly |
| Gateways behind config-driven seam | ✅ Built | `payment-channel` — "which channels are enabled comes from server config" |
| **Hosted/tokenized checkout — NO card fields** | ✅ Built (+**fixed demo**) | `app/client/payment-checkout` = hosted-handoff, "Salmon never sees or stores your card number, CVV or PIN". **Demo drift fixed:** its checkout had a fake Card-number/Expiry/CVC form → replaced with the hosted-handoff (no card fields). |
| Confirm only via signed webhook (backend), never client-side | ✅ Built | `payment-pending` (42) ⭐ "backend has NOT confirmed · never implies success"; demo `pay-confirm` → `/api/payments/checkout` → **pending**, resolves via SSE from admin verify |
| success/pending/failed/cancelled/expired, no duplicate | ✅ Built | `payment-result` states; `duplicate-guard` |

## 6.23 — Installments, Ledger, Invoices
| Clause | Status | Evidence |
|---|---|---|
| Total / verified paid / outstanding / upcoming / overdue — **pending separate from paid** | ✅ Built | `installments` (51) ★ "Verified paid vs pending kept separate" |
| Pay installment via gateway → verified result — **reuses 6.22 path** | ✅ Built | demo `pay-inst` → same `checkout` → `pay-confirm` → pending (no second money path) |
| Downloadable PDF invoices/receipts, `[CLIENT-APPROVED]` numbering/tax/legal | ✅ Built | `invoices`/`invoice-detail` — stub PDFs, placeholder copy |
| Chronological history: date/amount/currency/**channel category**/ref/status | ✅ Built | `payment-history` (54) — "channel category · reference · status — never a card number"; `catLabel` comment "categories only, never a PAN" |
| Timezone-aware due/overdue notifications | ✅ Built | `timezone.js`; his-timezone rendering |

## 6.24 — Chat & Consultation
| Clause | Status | Evidence |
|---|---|---|
| One approved channel (WhatsApp handoff **or** in-app), no faked transcript | ✅ Built | `chat-thread` — WhatsApp **handoff** panel (not a faked transcript) |
| Conversation/ticket reference + service status | ✅ Built | reference + status per provider capability |
| View/schedule/reschedule/cancel consultation | ✅ Built | `consultation-slots`/`-reschedule` full flow; confirms via scheduler action (6.9) |
| Zoom/Meet link + timezone reminders | ✅ Built | `consultation-confirmed` (60) — "his tz + Dhaka · external Zoom/Meet link (app does NOT host the call) · .ics", provider seam |

## 6.25 — Notifications & Media Performance
| Clause | Status | Evidence |
|---|---|---|
| Timezone-correct notifications, **no financial detail in payload** | ✅ Built | `notification-centre` — "No balance, amount or reference in any notification — deep link only. Times in your timezone." |
| HD/video/360/floor-plan via CDN, cached, responsive | ✅ Built | progressive/responsive variants |
| Content degrades on weak network **but money stays strict** | ✅ Built | `network-sim.js` (Fast/Slow-3G/Flaky/Offline dev toggle) — "when offline: NEVER cached, NEVER optimistic, NEVER silently retried. Money screens call `NetSim.blockPay()` and refuse to proceed. Media may degrade." Verified in `wire`, `pay-installment`. |

## The money laws — grep-proven

- **No card/CVV/PIN fields:** `app/client` hits for `cardNumber|cvv|cvc` are all **copy stating their absence** (payment-checkout, terms §7, payment-history "categories only, never a PAN") or `pan`-**gesture** false positives. Demo had one real violation (fake CVC form) → **fixed**; re-grep = **0**.
- **No client-side confirmation:** confirmation is a backend/admin action; the pending screen resolves from Salmon's verified notification (SSE), never from the gateway-return screen.
- **No optimistic payment:** grep for optimistic/markPaid patterns = **0**; offline blocks payment.
- **No financial detail in notifications:** explicit in `notification-centre`.
- **`SWIFT/BIC` on `wire.page.html`** is Salmon's **receiving-bank** detail (where the client sends the wire) — an outbound instruction, `__PLACEHOLDER`, not a client credential field.

## Cross-cutting
- **Consistency:** same design system/tokens/shared components as the rest of the app (shared `_shared.css`, `assets/js`).
- **Ripples:** KYC→Legal, payment→Finance, consultation→Scheduler, construction→client — all wired (demo SSE `kyc.*`, `booking.*`, `installment.verified`, `consultation.confirmed`, `construction.published`).
- **Bengali:** first-class throughout (every screen has EN/বাংলা via inline `t(bn,en)`); consent/pending/history verified.
- **Responsive:** device-framed mobile prototype, 360px-first.

## Fixes applied this pass
1. **Demo checkout (`demo/public/client/app.js`)** — removed the fake **Card-number / Expiry / CVC** form; replaced with the honest **hosted-checkout handoff** (no card fields), matching `app/client/payment-checkout`. Added `.hosted-cx` styles.

## Open questions (merged into master register)
Exchange-rate source+rounding · invoice numbering/tax/legal · chat provider (WhatsApp vs in-app) · Zoom vs
Meet · does any action require Verified KYC · map provider · wire reconciliation SLA · lock-expiry-mid-payment.
