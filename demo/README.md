# Salmon — Connected Live Demo (Client ↔ Admin · Partner ↔ Admin)

A **side-by-side, live-wired demo** that proves the Salmon mobile apps and the Admin
Panel are **one connected system**. A top-left **view switcher** flips the left
(mobile) pane between two fully-connected views — **Client ↔ Admin** and
**Partner ↔ Admin** — against the **same** server, store, SSE bus and event feed.
Every flow runs end-to-end with **real HTTP requests travelling between the sides**,
in front of the client, **without a page refresh**.

- **Client ↔ Admin** — register + KYC, book a unit, pay an installment
- **Partner ↔ Admin** — apply + approve, sales kit, the lead loop, commission,
  settlement (no bank field), With Investment (legal placeholders), team, meetings,
  support — with a 4-role admin (Super Admin / Manager / Finance / Legal)

Jump to the [client script](#the-5-minute-demo-script) or the
[partner script](#the-partner-demo-script-6-minutes).

> One browser window. Left = the client mobile app in a phone frame.
> Right = the staff admin console. A live event feed along the bottom shows every
> message pass between them. When the presenter acts on one side, the other side
> updates within a second — no reload. That is the demo.

---

## Run it

```bash
cd demo
npm install
node server.js
```

Then open **http://localhost:3000**. Both panes load. The demo is live.

- Split view (the demo)  → http://localhost:3000
- Client only            → http://localhost:3000/client
- Admin only             → http://localhost:3000/admin
- Raw API state          → http://localhost:3000/api/state
- SSE stream             → http://localhost:3000/api/events

Keep the **terminal visible** during the demo. Every request logs there — it is
the honest answer to *"is this really connected?"*

---

## The architecture — one store, two views

```
   Client app (phone)                 Admin panel (desktop)
   http://localhost:3000/client       http://localhost:3000/admin
            │  REST + SSE                        │  REST + SSE
            └──────────────┬─────────────────────┘
                           ▼
                  Express server  (server.js)
                  http://localhost:3000
                  data.json   ← the whole world, one file
```

- `GET /api/*` returns state · `POST /api/*` mutates it
- `GET /api/events` is a **Server-Sent Events** stream — every mutation broadcasts
  a delta to **all** connected browsers (client, admin, and the shell's feed)
- Both frontends subscribe to SSE and re-render on every relevant delta
- No frameworks. Vanilla HTML/CSS/JS on the front; Node + Express on the back.

Files:

```
demo/
  server.js            # Express: REST + SSE + JSON store + real lock timer
  data.seed.json       # the fixture (3 real projects, 74 units, seeded client)
  data.json            # live state (git-ignored; reset restores from seed)
  public/
    index.html         # the split-view shell (top bar, two iframes, event feed)
    shared/
      tokens.css       # shared Salmon brand tokens (maroon #800020)
      sse-client.js    # event bus over SSE + REST + view helpers  (global: Salmon)
      event-feed.js    # the live event feed renderer
    client/            # the client mobile app  (index.html, app.css, app.js)
    partner/           # the sales-partner mobile app (index.html, app.css, app.js)
    admin/             # the admin panel — both views (index.html, app.css, app.js)
  README.md
```

**Extend, not fork:** the partner side was added to the *same* server, store and SSE
bus. `server.js` gained partner endpoints (client endpoints untouched);
`data.seed.json` extended; `public/client/` and `public/admin/` gained modules but
kept their shells. All three original client flows still pass.

---

## Presenter controls (top bar)

| Control | What it does |
|---|---|
| 🔴 / 🟢 **connected** | live SSE connection indicator |
| **Presenter** toggle | pulses a maroon halo on the side where the next event will land — direct the client's eye without pointing |
| **Normal / Fast** | Fast shortens the booking lock to **10s** (from 60s) and the checkout beat, so the whole demo fits a 15-minute slot |
| **Feed** | show / hide the live event feed |
| **Reset demo** | one click restores seed data and reloads both panes — instant restart |

**Dev toolbar** (bottom of the admin sidebar): a **role switcher** — Super Admin /
Finance Officer / Legal — to show role differences if asked. KYC verification
needs Super Admin or Legal; payment confirmation needs Super Admin or Finance.

---

## The 5-minute demo script

> Reset first (top-bar **Reset demo**). Optionally flip to **Fast** mode.
> The one line to repeat: *"Nothing I'm about to click refreshes the other side —
> watch it update on its own."*

### 0:00 — Frame it (20s)
"On the left is the customer's phone. On the right is our staff console. They are
two separate apps talking to one server. Watch the feed at the bottom — every
arrow is a real message between them."

### 0:20 — Flow 1: Register → KYC (90s)
1. **Admin (right):** click **Global Clients**. "Here's our client directory."
2. **Client (left):** **Create account** → the form is pre-filled as *Rezaul Karim,
   UAE* → tap **Create account**.
3. **Point right, don't touch it:** a new row **Rezaul Karim** slides in at the top,
   highlighted; a toast fires — *"New client: Rezaul Karim registered from UAE"*;
   the bell badges; the feed shows `→ POST /api/clients` then `← event: client.created`.
   → *"I didn't refresh anything. That's live."*
4. **Client:** **Profile** tab → **Upload passport**. KYC flips to **Pending**.
5. **Admin:** **KYC review** (the count ticked up) → open Rezaul → **Verify identity**.
6. **Point left:** the phone shows a toast *"Your KYC has been verified"* and Profile
   now reads **Verified** — with no tap on the phone. The ripple went the other way.

### 2:00 — Flow 2: Book a unit (mind the lock) (90s)
1. **Client:** **Projects** → **Salmon Bellissimo** → tap available unit **B-704**
   → **Reserve this unit**. A **real countdown** starts (60s, or 10s in Fast).
   → *"That timer is real — the unit is genuinely held on the server."*
2. **Client:** **Pay ৳50,000 token** → stubbed hosted checkout (Stripe for a UAE
   client) → **Confirm payment**. The phone shows **"Confirming your payment"**.
3. **Admin:** **Reconciliation** → the webhook row is already there, *signature
   verified*, amount and reference match → open it → **Confirm booking**.
   Toast: *"Booking BK-… confirmed — Rezaul notified."*
4. **The money shot — point at the phone:** with **no tap and no refresh** the
   pending screen resolves to **"Booking confirmed."** The unit shows Booked and an
   installment schedule appears. → *"The phone resolved from the admin's click,
   not a timer. That's the two systems in lock-step."*

> Optional honesty beat: reserve a unit and **let the timer run out**. The unit
> releases to Available on both sides and the phone says the lock expired — no fake
> "success". Proof the state is real.

### 3:30 — Flow 3: Pay an installment (60s)
1. **Client:** sign out → **Sign in** (pre-filled *Ayesha Rahman*, who has a running
   ledger) → **Installment tracker**. Next due **৳2,00,000**.
   *(Or stay as Rezaul and pay his first installment — same flow.)*
2. **Client:** **Pay now** → checkout → **Confirm**. Phone shows "Confirming…".
3. **Admin:** **Reconciliation** → the installment payment is **Pending
   verification** → open → **Verify installment**. Toast names the ripple:
   *"Installment 3 verified for Ayesha Rahman — ৳2,00,000."*
4. **Point left:** phone resolves to **"Payment successful"**, the tracker's
   verified total rises, outstanding drops, next due advances, and a receipt link
   appears.

### 4:30 — Close (30s)
Click any row in the **event feed** — it highlights the exact element it affected on
the corresponding side. "Every arrow you saw was a real HTTP request or a real
server-pushed event. Two apps, one system, fully connected."

---

## Two views — Client ↔ Admin and Partner ↔ Admin

The top-left **view switcher** flips the left (mobile) pane between the **client**
app and the **sales-partner** app. **The admin panel on the right is the same
system in both views** — same shell, same store, same event feed — it just shifts
focus (Clients / Finance for the client view; Partners / Commission / Settlements
for the partner view), and remembers where you were when you switch back.

Extra presenter aids for the partner side:

| Control | What it does |
|---|---|
| **View switcher** (top-left) | Client ↔ Admin / Partner ↔ Admin, one click, no reload |
| **Partner:** dropdown (left pane, partner view) | flips the "logged-in" partner — Shahin / Nasrin / Karim / **New applicant** (to register live) |
| **Dev toolbar · role** (admin sidebar) | Super Admin / Manager / Finance Officer / Legal — the sidebar + dashboard **rebuild instantly** on switch |

Seeded partners: **Shahin Alam** (Cumilla, Zero Investment, Silver — primary demo
partner, has a lead ready to convert), **Nasrin Ahmed** (Dhaka, With Investment,
Gold — for Flow 6), **Karim Rahman** (Cumilla, Gold, **team lead** with Shahin under
him — Flow 7). A pending application from **Rafiqul Islam** (Chattogram) sits in the
approval queue. Mock OTP is **123456**.

---

## The partner demo script (~6 minutes)

> Switch to **Partner ↔ Admin** first. Reset if needed. The through-line:
> *"Same system, different actor — watch the admin light up, then watch the ripple
> come back to the partner's phone."*

### Flow 1 — Register → the approval wall → the reveal ⭐ (90s)
1. Left pane **Partner:** dropdown → **New applicant (register live)** → tap
   **Become a sales partner**.
2. Form is pre-filled (Md. Shahin Alam, Cumilla, Zero Investment). Tap **Send OTP**,
   enter **123456**, **Verify**, tick consent, **Submit application** → the phone
   lands on a **pending-approval wall** with SLA text.
3. **Admin (right), no refresh:** the **Approvals** queue has a new row + a toast
   *"New application — Md. Shahin Alam, Cumilla, Zero Investment."* Open it. The
   **Partner ID is shown before you confirm** (e.g. `SDP-CUM-00418`); territory is
   editable, rank defaults to Silver. Click **Approve**.
4. **Point at the phone:** the wall resolves to **"Welcome to Salmon!"** with the
   Partner ID and a digital business card — no tap on the phone. *"He's in, live."*
5. **Rejection variant:** instead of approving, type a reason
   (*"insufficient documentation"*) and **Reject** — the phone's rejection screen
   shows **that exact string**. Point at it.

### Flow 2 — Sales kit + the cross-view moment ⭐ (60s)
1. **Partner:** dropdown → **Shahin**. Tap **Projects** → open **Bellissimo** →
   the live inventory (same source of truth the client books from) + a
   **Brochure** button. Tap it → *"Access logged."*
2. Admin → **Documents** shows the download in the activity log.
3. **The power play:** Admin → **Catalogue** → Bellissimo → **Publish update**.
   Switch the view to **Client ↔ Admin** and open Bellissimo → the update is in the
   client's construction timeline. Switch back to **Partner** → it's in the sales
   kit. *"One event, three actors, all live."*

### Flow 3 — The lead loop ⭐⭐ (90s)
1. Shahin → **Submit a lead**. Note the **consent checkbox** — the button stays
   disabled until it's ticked (*"deliberate friction — the prospect must permit it"*).
   Submit (prospect *Karim Uddin*, Bellissimo).
2. **Admin, no refresh:** Leads queue lights up + toast *"New lead: Karim Uddin,
   interested in Bellissimo, from Shahin Alam."* Open it.
3. Move the status: **Contacted → Meeting scheduled → Visit completed**. Each move
   advances the **simplified timeline** on Shahin's phone. Add an **internal note** —
   switch to the phone and show it **does not appear** (partners never see internal notes).
4. **Verify conversion** → lead flips to **Converted**, a **commission is created
   Pending**, and the phone shows a small celebratory *Converted* state.

### Flow 4 — Commission approval → the money side ⭐ (60s)
1. **Dev toolbar → Finance Officer.** The sidebar + dashboard **rebuild** — commission
   queue front and centre. *"Now finance takes over."*
2. **Commissions** → open the pending one → **enter the amount by hand** (৳12,000) +
   optional note → **Approve commission**.
3. **Point at the phone:** Shahin's **approved balance jumps ৳0 → ৳12,000** with a
   toast *"Commission approved: ৳12,000 for Karim Uddin (Bellissimo)."* Rehearse this —
   it's the partner side's biggest moment.

### Flow 5 — Settlement → external payout → mark settled ⭐ (75s)
1. Shahin's dashboard → **Request settlement**. **Point at what's missing:**
   *"There is no bank field here. Salmon's finance team already knows how to pay
   Shahin — they've been doing it for years. This app records the request; it never
   moves money."* Only an amount, capped at the balance. Confirm ৳12,000.
2. **Admin (Finance), no refresh:** Settlement queue lights up + toast. Open →
   **Approve** → the phone shows *Approved (awaiting payment)*.
3. Say it out loud: *"Now, in the real world, someone at Salmon transfers ৳12,000 to
   Shahin via bKash, or bank, or cash. The panel doesn't do that. It waits."*
4. Click **Mark as settled** → dialog: payment date, **channel category**
   (Cash / Bank / bKash / Nagad / Cheque), non-sensitive reference, mock evidence.
   Confirm.
5. **Phone, no refresh:** status flips to **Settled** with the reference; the hero
   balance returns to ৳0 — *"the money is his now."*

### Flow 6 — With Investment (mechanism only) ⚠️ (45s)
1. **Partner:** dropdown → **Nasrin** → **With Investment**.
2. Show the programme page, the confirmed **share**, and the **return schedule** —
   every amount reads **`[AMOUNT — LEGAL SIGN-OFF REQUIRED]`** and the disclaimer is
   **`[LEGAL COPY REQUIRED]`**. Say the words:

   > *"With Investment is legally sensitive. Salmon's legal counsel hasn't finalised
   > the commercial rules or the disclaimer copy. So the app records the shape —
   > enquiry, share record, return schedule — but every amount and every legal phrase
   > is deliberately blank. When Salmon's lawyers deliver those two things, we fill
   > them in. Until then, the app promises nothing."*

3. **Partner → Admin loop:** submit a **new enquiry** from Nasrin's phone (it is a
   *request to be contacted*, not a purchase) → flip to **Admin** → the enquiry lands
   on the **investment desk**; **Record confirmed share** (Finance/Super-Admin only) —
   note there is **no amount field**; the record is the *shape* of a decision made
   offline. It ripples back to Nasrin's read-only **P53**.
4. **Higher-tier commission — same ledger:** open Nasrin's **pending commission**
   (`COM-2024-0685`) in the **common commission queue** and approve it with a
   hand-typed amount. Say the words:

   > *"The 'higher tier' isn't a different engine. It's the same commission ledger,
   > the same Pending → Approved → Settled path, the same hand-entered number — just
   > tagged With Investment. One surface, auditable, no formula."*

   It flows to Nasrin's **earnings** exactly like any commission. The *investment
   returns* stay held as markers; the *commission* is real money, entered by a human.

### Flow 7 — Team lead visibility (30s)
**Partner:** dropdown → **Karim** → his dashboard gains a **Team** section →
roster (Shahin + 2 others), team target vs achievement, referral link. Switch back
to **Shahin** to show he *doesn't* see the team — scoping works.

### Flow 8 — Meetings + support (30s, proof of coverage)
- **Meetings:** Shahin requests a meeting → Admin (Manager) **confirms with a Zoom
  link** → phone shows the confirmed meeting + link.
- **Support:** Shahin raises a ticket to Accounts → Admin **replies + closes** →
  phone shows the reply and closed status.

### The four roles
Flip **Dev toolbar · role** to show each rebuild: **Super Admin** (everything),
**Manager** (leads, approvals, meetings, support, conversion verify), **Finance
Officer** (reconciliation, commissions, settlements, ledgers), **Legal / Document
Controller** (KYC, documents). *"Now legal takes over"* / *"now finance takes over"*
are real transitions in the panel.

---

## Multi-role workflow — the admin is four desks, not one Excel sheet

The most persuasive thing after "client and partner are connected" is that the
admin panel is **a workflow across four separate desks**. A lead moves Manager →
Finance → Partner. A KYC moves Client → Legal → Client. A booking moves Client →
Finance → Client. **Each handoff is one click on the role switcher**, and the
sidebar rebuilds in front of the client.

**The role switcher** sits in the admin **topbar** (not the dev menu): current role,
a live **"N waiting"** badge showing that desk's queue depth, and instant rebuild on
switch. Each desk **remembers where it left off**. Permissions are real, not
cosmetic: buttons a role can't use aren't rendered, and the server returns **403** —
e.g. a Manager has no "Approve settlement" button, and the settlement route shows
**Access denied**. Every feed entry is **role-attributed**: *"Tanvir Ahmed (Finance):
Approved ৳12,000."*

> Everything below is seeded so **no desk is ever empty on first load** — 3 pending
> KYC (one blurry, for the reject demo), 2 leads at Meeting-scheduled, a meeting and
> a consultation to confirm, 2 tickets, 2 webhooks (one a currency mismatch), a wire,
> 2 pending commissions, a partner application, and 3 repository documents.

### Handoff C — Partner → Manager → Finance → Partner (the climax, ~90s) ⭐⭐
Switch to **Partner ↔ Admin**, actor **Shahin**. Then, on the admin:
1. **Role: Manager.** Open the lead already at *Meeting scheduled* (Karim Uddin).
   Add an **internal note** ("Followed up by phone, prospect asked for another
   week") — say what it is out loud. Then **Verify conversion** → a **Pending
   commission** is created.
2. **Switch role → Finance.** Point at the sidebar rebuilding and the queue badge.
3. Open the new Pending commission. *"Finance enters this by hand — no rate table, no
   formula. It's a human decision, and it's audited."* Type **৳12,000**. Confirm.
4. **Point at the partner phone** — Shahin's hero jumps **৳0 → ৳12,000**.
5. On the phone: **Request settlement**, submit ৳12,000. *(Point at the missing bank
   field — "the app records the request; it never moves money.")*
6. Admin, still **Finance**: open the settlement → **Approve**.
7. *"Now someone at Salmon bKash's Shahin ৳12,000. The panel doesn't do that — it
   waits."* Click **Mark as settled** — channel category + non-sensitive reference.
8. **Point at the phone** — **Settled**, reference shown; balance back to ৳0.
9. **Prove the wall:** switch **Manager**, add another internal note on the lead;
   switch to the partner view — it isn't there. *"Shahin sees the outcome, not how we
   got there."* And switch **Manager → try to find Approve Settlement** — it's gone.

### Handoff B — Client onboarding + booking (Legal → Client, Client → Finance → Client)
1. **Role: Legal.** KYC queue has 3 pending. Open **Rezaul** — point at the
   **"Viewing logged"** badge (*"every look at this passport is recorded"*) →
   **Verify**. Switch to the client view: Rezaul's KYC flips to **Verified** live.
2. **Rewind for the reject:** open the blurry one (**Imran**) → **Reject** with
   *"Photo unclear, please retake."* → the client sees **that exact reason**.
   *"Whatever Legal types appears on the buyer's screen verbatim — so the copy matters."*
3. **Booking chain:** on the client phone, book a unit and pay the token stub.
   **Role: Finance** → **Reconciliation** → confirm the clean webhook → the phone
   resolves to **Booking confirmed**. (Show the seeded **currency-mismatch** webhook
   too — its **Confirm is disabled** with an honest "amount mismatch" banner.)
   *International wire variant:* **Wire verification** → verify Zayan's wire → his
   booking confirms the same way.

### Handoff D — Document lifecycle (Legal → Partner / Client)
1. **Role: Legal → Documents.** Upload a deed (or use the seeded internal one),
   classify it **Internal** — it appears nowhere on the phones.
2. Change its visibility to **Partner-visible**. Switch to the **partner** view →
   Shahin's sales kit now lists it (a toast fires live). Flip another to
   **Client-visible** → it shows in the client's project "Shared documents".
3. Back to **Legal → Access log**: Shahin's open of the document is already recorded,
   with who and when. *"That log is what makes the whole compliance model real."*

### Permission separation — prove it isn't cosmetic
As **Manager**, there is no *Approve settlement* / *Verify KYC* button anywhere, and
navigating to those desks shows **Access denied** (the server also 403s). As
**Finance**, no *Verify KYC*. As **Legal**, no *Approve commission*. Flip roles and
watch the badges: *"Finance · 4 waiting"* vs *"Legal · 3 waiting"* — each desk sees
only its own work.

---

## Handoff E — Task lifecycle (Tasks & Targets, ~90s)

The operational loop: a Manager (or Team Lead) assigns work, the partner does it, the
review surfaces roll up. Targets are a **lens on real data** — achievement is derived
from converted leads, never typed.

1. Admin **role: Manager** → **Tasks & Targets → Assign a task** (W02). Optionally
   pick a **template** ("Follow-up call"). Title *"Follow up with Karim Uddin re:
   Bellissimo B-704"*, due tomorrow 6pm, tick **evidence required**. Assign to Shahin.
   *(Scope can also be a whole team/territory — the confirm line summarises the fan-out.)*
2. Confirm → the event feed shows the arrow → **switch to the Partner view** (Shahin).
3. Shahin's phone shows a push toast *"New task from Farhana Kabir (Manager)"*; the
   dashboard's **Tasks** count ticks up.
4. Shahin → **My tasks** (P63) → the task is at the top → open it (P64) → **Complete**
   (P65): note *"Called Karim, meeting Thursday 4pm at Bellissimo site"*, attach a mock
   photo, confirm. *(Evidence is required, so the button won't fire without it.)*
5. Back on the admin (Manager) → **Tasks board** (W01): the card is now in **Complete**;
   open it (W04) → the partner's note + evidence are there.
6. **Team completion** (W05): Shahin's row shows the updated completion rate (soft
   colour — 90%+ green, 60–90% neutral, never red short of overdue).
7. **Role: Super Admin → Territory trend** (X02): Cumilla's completed count has ticked
   up — one chart, one table, no dashboard-of-dashboards.

**Overdue, no actor:** the seeded "Collect NID" task is past due — within a few seconds
the server auto-flips it to **Overdue**; it surfaces in **Missed activities** (W06) and
red on Shahin's P63, with nobody touching anything.

### The team-lead touch (optional 30s)
Switch the partner actor **Shahin → Karim** (his team lead). Karim's dashboard has a
**Team** tab → **Assign a task** (P63b): pick Shahin from his roster, title, due, assign.
Switch the actor back to **Shahin** → the new task is on his P63. *"The team lead's
assignment power lives in the app, not the panel — he assigns from his shop, between
customers."* Scope is enforced: Karim can only assign to his own team.

---

## Partner dashboard (Req 6.2) — three-tier, graph-supported

Shahin's dashboard is built to one focal point, not a wall of cards:

- **Tier 1 — hero:** **Approved commission** (large, maroon) with the **Request
  settlement** action attached; **verified sales** as small context; a row of three
  subordinate chips — **Pending / Settled / Returns**. Only *Approved* is presented as
  spendable; pending is never folded in. Returns shows a value for With-Investment
  partners and **`—`** for Zero-Investment (present, for layout stability).
- **Tier 2 — target + pipeline:** a **simple horizontal progress bar** (derived
  achievement vs the admin-set target) with a **selectable period**, plus a 2×2 band of
  status counts (leads / meetings / tasks / tickets).
- **Tier 3 — ambient:** one quiet recessed line — recent activity, updates, training.
- **Six quick actions** in a fixed 3×2 grid (no horizontal scroll): Lead, Booking,
  Meeting, Sales kit, Support, Settle.
- **Bengali-first:** a **বাং / EN** toggle in the header; all strings externalised;
  verified for no overflow in the tight spots (the six-action grid, the chips).
- Maroon appears **once per zone** (hero number, bar fill, action icons); the ৳0
  new-partner state reads as intentional ("Your approved earnings will appear here").
- Restraint by design: **one progress bar, no chart wall, no gauge, no projection**,
  and no manual achievement input.

---

## The three flows (what actually happens)

**Flow 1 — Register + KYC**
`POST /api/clients` → `client.created` (admin row + toast) ·
`POST /api/kyc/upload` → `kyc.pending` (admin queue) ·
`POST /api/kyc/verify` → `kyc.verified` (phone toast, no tap)

**Flow 2 — Book a unit**
`POST /api/bookings` locks the unit + starts a real countdown → `unit.locked` ·
`POST /api/payments/checkout` (stub) → `webhook.received` (admin queue) ·
`POST /api/bookings/confirm` → `booking.confirmed` (phone resolves) + schedule generated ·
lock sweeper → `booking.expired` + unit released if not confirmed in time

**Flow 3 — Pay an installment**
`POST /api/installments/pay` → `payment.pending` (admin queue + ledger, pending) ·
`POST /api/installments/verify` → `installment.verified` (phone resolves, ledger clears)

---

## The data (dummy, but coherent)

`data.json` seeds from `data.seed.json` on first run.

- **3 real Salmon projects** with real images from `admin.salmondevelopersbd.com`:
  Salmon Bellissimo (Bashundhara, ongoing), Salmon Florentine (Bashundhara Block N,
  ongoing), Zheel View (West Rampura, handed over). **74 units** total across them,
  with a healthy set Available to book. Prices are plausible BDT placeholders.
- **1 seeded existing client** — *Ayesha Rahman* (Bangladesh) — with a confirmed
  booking and a **partial installment history**, so Flow 3 shows a running ledger.
  Room for the new client the presenter creates live (*Rezaul Karim*).
- **3 staff** — Super Admin (Nabila Islam), Finance Officer (Tanvir Ahmed),
  Legal / Document Controller (Sadia Chowdhury). Signed in as Super Admin by default.
- **Gateways** — Stripe (UAE), SSLCommerz (Bangladesh), Bank Wire (everywhere).
  The client's country picks the gateway on the checkout stub.
- **Config** — token ৳50,000 flat, lock 60s (10s in Fast), 12-installment schedule
  generated on booking confirmation.

---

## What this demo deliberately is NOT

Stubbed, by design: hosted checkout (no real Stripe/SSLCommerz charge), receipt PDFs
(placeholder links), auth (in-memory session, no hashing), webhook signature crypto
(the *flow* is the point, not the crypto), push notifications (simulated as toasts).
Out of scope entirely: the Sales Partner side and all other CRM modules. English only.

---

## Acceptance test

If the presenter clicks something on one side and the other side does not update
within a second **without a refresh**, the demo has failed. All three flows meet
that bar; the booking lock countdown is real and expiring it produces the correct
honest state on both sides.

## Open questions (from the brief)

1. **Default view** — ships in split view by default (recommended).
2. **Puppeteer mode** (presenter drives the client from the admin keyboard) — noted
   as a nice-to-have, not built.
3. **Audience** — event feed is shown by default (technical audience). Hide it with
   the **Feed** toggle for a non-technical room and reveal it when someone asks
   *"how does it work?"*
