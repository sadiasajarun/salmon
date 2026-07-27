# Alignment — Training & Sales Kit (Req 6.15)

> A **content library, not an LMS.** The client wants a *learning vibe* that arms
> partners to win deals — categorized, browsable, a sense of progression through
> "viewed" state, and a sales kit organized for a partner about to walk into a
> pitch. **No quizzes, no certification, no course machinery.**

Reconcile-and-close-gaps pass. Status found by **inspecting the real code** across
the three surfaces. The **partner mobile** surface was already a complete, disciplined
library; the **CRM admin side did not exist** and was the primary gap. This pass built
the admin content-management + targeting desk, completed the viewed/**new** progression,
and added a mechanical **library-only fence**.

Surfaces:
- **Partner mobile** — `app/partner/{training-library,content-viewer,training-downloads,sales-kit,gated}.page.html` + `app/assets/js/{partner-training,partner-kit}.js`
- **Admin panel** — CRM **Y01** `content-management` + `assets/js/{content,content-data}.js` (**new**)
- **Live demo** — sales-kit brochure download is wired with ripple + admin doc-activity log (`demo/server.js`, `demo/public/{partner,admin}/app.js`); the training library is an ambient count only
- **The fence** — `.claude/gates/training-library-only-guard.sh` (new)

## Clause status (after this pass)

| # | Clause | Where it lives | Before | After | What changed |
|---|--------|----------------|--------|-------|--------------|
| 6.15.1 | **Categorized library**: policies, guidelines, FAQs, short video tutorials | TR01 `training-library` + `partner-training.js` | **Done (partner)** | **Done + new-state** | Four categories with visual identity (📘 policies · 📕 guidelines · ❓ FAQs · 🎬 videos), search, tappable content rows. **Added a "New" badge** for unviewed items to complete the **viewed / new** progression (the only progress markers — no scores). |
| 6.15.2 | Admin **upload / publish / update / unpublish** training + sales content | **NEW** CRM **Y01** | **Missing** — no admin authoring path existed anywhere; content was hard-coded client-side and the gap wasn't even logged | **Done** | New content desk: **Upload** (mock, starts as Draft) · **Edit** · **Publish / Unpublish** (unpublish hides from partners, retains as Draft — nothing deleted) for both training + sales-kit content. Permission-gated (`MANAGE_CONTENT` = Super-Admin/Manager), audited old→new, ripples to the partner library. |
| 6.15.3 | Partners **view / download** brochures, layouts, scripts, presentations, videos | TR02 `content-viewer`, TR03 `sales-kit`, TR04 `training-downloads` | **Done** | **Done (verified)** | Content viewer (video tap-to-play, no autoplay-with-sound; clean paginated docs). Sales kit organized **per project** with 6 asset categories, **file sizes shown** (rural mobile data), **offline** download + a Downloads screen with a summed total. |
| 6.15.4 | Content **targeted** by program / rank / team / territory where required | TR06 partner `gated` + `partner-kit.js`; **NEW** Y01 targeting | **Partial** — partner reflected gates as locked-with-reason, but there was **no admin surface to set targeting** | **Done** | Y01 **Set targeting** assigns a gate (`program·rank·team·territory`) per item, audited + rippled. Partner side unchanged and correct: gated items render **locked-with-reason** (`gated.page.html`), never hidden, no client unlock — gating is server-side. |
| 6.15.5 | **Library only** — no quizzes, certification, or LMS | whole surface | **Done (copy-only)** | **Done + fenced** | New grep guard scans 10 training/kit files → **0 LMS artifacts** (quiz / certificate / pass-fail / exam / completion-% / progress-ring / "N of M complete"). Negation-aware so the module's own "NO quizzes/scores/certificates" copy passes. "viewed" + a plain "New" badge are the only markers. |

## The learning vibe (TR01) — the module's identity

Categories carry visual identity (icon + label), content cards show type icon + meta
(pages·MB / min·MB), **viewed** items read "· Viewed" and unviewed items now carry a
subtle **"New"** pill — a sense of progression without a progress ring. Search across
the library. It reads as a library you want to explore, not a file dump.

## The sales kit (TR03) — arming the partner

Organized **per project**: a partner prepping a Bellissimo pitch selects Bellissimo and
grabs brochures, floor plans, gallery, scripts, decks in one place. Sizes shown for
mobile data; downloads persist for offline use in the field. Gated premium assets
(e.g. rank·gold pitch deck, With-Investment brief) show **locked-with-reason**.

## The admin desk (Y01) — TR05 + TR06 in one island

Mirrors the console's existing island pattern (shell/components/permissions/audit/ripples
reused, zero new design system). Two sections — **Training library** and **Sales kit** —
each a data table with Status (Published/Draft) + Audience (All / gated reason) columns
and per-row **Edit · Set targeting · Publish/Unpublish**. Content + gate shapes **mirror
the partner modules** (`partner-training.js` / `partner-kit.js`) so a real backend feeds
both. Reachable at `crm-prototype/screens/Y01-content-management.html`; wiring it into the
console sidebar/dashboard is a small merge-time task (logged).

## The fence (clause 6.15.5)

`bash .claude/gates/training-library-only-guard.sh` → **PASS** (`{lms_artifacts:0, files:10}`).
Fails the build on LMS machinery; negation-aware; asserts the "library, not an LMS"
framing is present.

## Done-when checklist

- [x] Maps all 5 clauses across surfaces
- [x] Categorized library with a **learning vibe** (visual identity, viewed/**new** state, search)
- [x] Sales kit organized **per project**, sizes + offline
- [x] Admin **publish / unpublish / update / upload** (Y01) — permission-gated, audited, rippled
- [x] Admin **targeting** by program/rank/team/territory; gated content shown **locked-with-reason**, never hidden
- [x] **Library only** — no LMS/quiz/certification, **grep-proven** by a build guard
- [x] Reuses shared components; ripples to mobile; audited
- [x] Open questions logged (below + `crm-prototype/OPEN_QUESTIONS.md`)

## Open questions

1. **Content categories** — is `Policies / Guidelines / FAQs / Video tutorials` (training) and `Brochures / Layouts / Images / Videos / Scripts / Presentations` (kit) the confirmed set?
2. **Which content is gated, by what attribute?** *Demo: placeholder gates (rank·gold deck, program·withInvestment brief).* The confirmed audience rules are undefined; the team/territory attribute value lists are placeholders.
3. **Video hosting** — CDN, embed, or in-app? *Demo: poster + tap-to-play mock; kit intro videos link to the client video page.*
4. **Viewed-state** — tracked per partner server-side, or purely a local visual marker? *Demo: local `localStorage` only.* If it must sync across devices it needs a backend field (still not completion tracking — just "viewed").
