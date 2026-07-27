# Alignment — CRM Dashboard & Reporting (Req 6.17)

Reconcile-and-build pass on the admin panel (`crm-prototype/`). Status found by **inspecting the real
code**, then patched. Sibling alignments: [`ALIGNMENT.md`](ALIGNMENT.md) (Req 6.5 catalogue),
[`ALIGNMENT-6.1-partner-registration.md`](ALIGNMENT-6.1-partner-registration.md).

## Where the module lives

Reporting screens are **Q01–Q04** (the RP01–RP04 of the brief), served by the Part-7 **Connect** engine:
- `screens/Q01-reports-hub.html` (RP01) · `Q02-report-viewer.html` (RP02) · `Q03-export-queue.html` (RP04) · **new** `Q04-metrics-overview.html` (RP03)
- **new** `assets/js/reporting.js` — `CRM.Reporting`: `reportData(key,{role,filters})`, `metricsFor(role)`, `scopeFor(role)`, `filterOptions()`
- **new** `assets/js/reporting-charts.js` — `ReportChart.render(host,spec)` (one style; bar / funnel / donut / line)
- `assets/js/connect.js` (`SCREENS.Q01–Q04`, `exportCsv`) · `assets/js/connect-data.js` (`reports`, `exportHistory`)

## Clause status (after this pass)

| # | Clause | Before | After (what actually shipped) |
|---|--------|--------|-------------------------------|
| 6.17.1 | Summary metrics — ~16, grouped by domain, role-scoped | **Drifted** — no metrics board in the reporting module; metrics lived only as four **flat 4-tile** role dashboards (`dashboards.js`), not grouped, and missing ranks/teams/tasks/returns | **Done** — new **Q04 metrics overview**: `metricsFor(role)` returns the 16 metrics **grouped** into **People / Catalogue / Sales / Money / Activity**, each a `C.metricsRow` under a group header. Computed live from `CRM.People/Catalogue/Pipeline/Payout/Finance/Connect`. **Role-scoped** (verified: SUPER_ADMIN partners=20 / teams=5, MANAGER partners=9 / teams=3). Investment returns render `🔒 legal` (record-only); tasks/training marked `—` (no panel store, OQ #1). |
| 6.17.2 | Filters: date range, project, inventory status, program, territory, team, team lead, rank, status | **Partial** — Q02 had only 5 filter keys (`from`, `project`, `territory`, `rank`, `status`) **and they were inert** (`onChange` only toasted; rows never re-queried) | **Done** — Q02 now renders the **full 9-key set** (`from`, `to`, project, inventoryStatus, program, territory, team, teamLead, rank, status), options driven by **live data** via `filterOptions()`. Filters are **functional**: `onChange → draw()` recomputes `reportData(key,{role,filters})` and re-renders chart + table. Persisted across nav via the shared `FilterBar` sessionStorage. |
| 6.17.3 | The 11 basic reports, one chart + one table each | **Mostly Done** — all 11 report keys existed but `reportData` returned **static hardcoded rows** (not computed, not scoped); charts were a single CSS-bar type; 2 reports had no chart | **Done** — all 11 reports now **computed from live data** (`lead-conversion`, `territory-activity`, `inventory`, `meeting-outcomes`, `commission`, `sales-records`, `settlement-recon`, `document-activity`, `helpdesk` are live aggregates; `task-completion` is a flagged placeholder — no panel task store, OQ #1; `investment-return` stays amber-locked, OQ #5). Each renders **one chart** (type chosen to fit: conversion → **funnel**, inventory/meetings → **donut**, territory/commission/helpdesk → **bar**) via the shared `ReportChart` + **one table**. No builder, no chart wall. |
| 6.17.4 | CSV export gated to non-sensitive, each export audited | **Done (kept)** — `exportable` flag per report; button gated `r.exportable && Perm.can(role,'EXPORT_REPORT')`; export writes `Audit.audit({action:'EXPORT_REPORT'})` + an `EXP-###` row (report, filters, rows, actor, when) surfaced in Q03 | **Done (preserved + tightened)** — mechanism unchanged; export now serialises the **role-scoped, filtered** rows (a Manager's CSV contains only their patch). Sensitive reports (`sales-records`, `commission`, `investment-return`, `settlement-recon`) stay non-exportable regardless of role. The exact classification remains Salmon's call (OQ #1). |
| 6.17.5 | Role-based visibility — same screen, different truth per role | **Missing** — `reportData` was role-agnostic; identical rows for everyone; no `scopeFor` | **Done** ⭐ — `scopeFor(role)` is the spine: SUPER_ADMIN / FINANCE → organisation-wide; **MANAGER → one division** (`Chattogram`, a placeholder boundary — OQ #3). Every report and every metric narrows to the role's scope. **Provable by role switch** (verified via smoke test): lead-conversion SA = 3 territory rows → MANAGER = 1; commission SA = 6 partners → MANAGER = 3; Q04 partners 20 → 9. A scope banner on Q02/Q04 tells the user which truth they're seeing. LEGAL lacks `VIEW_REPORT` (unchanged). |

## Design notes (honest)

- **The engine is additive.** `CRM.Reporting` is a new island so the viewer (Q02) and the metrics board (Q04) share **one** source of truth; the old static `CN.reportData` is superseded but left in place (harmless). This kept the change low-risk and the existing Connect screens (N/O/P) untouched.
- **Role-scoping models the panel's roles, not a mobile team-lead.** There is no `TEAM_LEAD` panel role (team leads are partners in the mobile app). The brief's "team lead sees their patch" is realised as **Manager → division scope**; the exact reporting boundary (division? district? team?) is **OQ #3**. The mechanism is boundary-agnostic — only `MANAGER_DIVISION` changes.
- **Org-wide resources aren't force-scoped.** `inventory`, `document-activity`, `helpdesk` are organisation resources; a Manager still sees them in full (noted in-screen). Territory/partner-dimensioned reports are where the per-role truth diverges — which is the honest behaviour.
- **One chart style, four types.** `ReportChart` is a single dependency-free component (SVG/CSS, CRM tokens) with `bar` / `funnel` / `donut` / `line`. No Chart.js, no per-report chart components — the type is data, not code.
- **Discoverability.** Added a role-gated **Reports** entry to the sidebar (`router.js` NAV + `SIDEBAR` for SUPER_ADMIN / MANAGER / FINANCE; `app.js` `MODULE_ENTRY` → Q01; active-marking in `connect.js`). Previously reporting was reachable only via the Part-7 sub-tab.
- **Sensitive figures stay sensitive.** Commission amounts, booking identifiers, settlement references, and investment returns are view-only. Investment-return values are never numeric — they read `[AMOUNT — LEGAL SIGN-OFF REQUIRED]` (Req 6.6 discipline, OQ #5).

## Done-when checklist

- [x] This doc maps all **five** clauses with the diff
- [x] **Q04 shows all summary metrics, grouped and legible**, role-scoped (People/Catalogue/Sales/Money/Activity)
- [x] **Q02 renders each of the 11 reports** with the full 9-filter set, one chart, one table
- [x] **CSV export gated to non-sensitive**, each export audited with its filters (Q03 history)
- [x] **Role-based visibility works** — same report, different truth per role, proven by role switch (smoke-tested SA vs MANAGER)
- [x] Fixed report list, no builder, no chart wall
- [x] Reuses shared components (`MetricCard`, `FilterBar`, `mountDataTable`) and **one** chart style
- [x] 5 open questions logged (`crm-prototype/OPEN_QUESTIONS.md`, Req 6.17 section)

Verification: all reporting JS syntax-clean; `CRM.Reporting` role-scoping and all 11 reports smoke-tested
against the live data; all four chart types render; **Q01–Q04 boot-render with zero runtime errors as
both SUPER_ADMIN and MANAGER**.
