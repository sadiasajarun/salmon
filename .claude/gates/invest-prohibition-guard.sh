#!/bin/bash
# invest-prohibition-guard.sh — the fence around the "With Investment" module (Req 6.6).
#
# The most legally sensitive module in the app. Salmon's counsel has NOT yet
# delivered the commercial rules, the return-schedule structure, or the
# disclaimer copy. Until they do, the module must be a passive record-keeper:
# it computes nothing, promises nothing, executes nothing, disburses nothing.
#
# This guard makes that discipline MECHANICAL, not a note. It fails the build if
# the With-Investment surface:
#   (A) uses promise / projection language as a promise (guaranteed return,
#       assured profit, risk-free, projected earnings, next-payment countdown …),
#   (B) contains a payout / disbursement / return-calculation mechanism,
#   (C) renders a real return or investment amount instead of the mandated
#       marker  [AMOUNT — LEGAL SIGN-OFF REQUIRED]  (no legally-consequential
#       value may be shown before legal sign-off).
#
# It is NEGATION-AWARE: the disciplined copy deliberately NAMES these forbidden
# ideas in order to negate them ("Salmon is NOT a guarantor", "returns are NOT
# guaranteed", "NO calculator"). A line that carries a negation token — or the
# inline opt-out  `guard-ok`  — is allowed. A risk term with no negation is a
# violation.
#
# Scope: the DEDICATED With-Investment module files only. The Part-6 commission
# ledger is a separate module with its own honesty rules (a legitimate "payout"
# lives there); the live-demo investment flow was verified clean by hand and is
# not re-scanned here to avoid cross-module false positives.
#
# Usage:   bash .claude/gates/invest-prohibition-guard.sh [repo_root]
# Exit 0 = PASS, 1 = FAIL. Human-readable report + machine JSON on the last line.

set -u
ROOT="${1:-.}"
ROOT="$(cd "$ROOT" 2>/dev/null && pwd)" || { echo "guard: repo root not found"; exit 1; }

# --- module file set -------------------------------------------------------
MODULE_FILES=(
  "app/assets/js/partner-invest.js"
  "app/partner/invest-enquiry.page.html"
  "app/partner/enquiry-status.page.html"
  "app/partner/invest-record.page.html"
  "app/partner/return-schedule.page.html"
  "app/partner/return-entry-detail.page.html"
  "app/partner/disclaimer.page.html"
  "app/partner/program-with.page.html"
  "app/partner/investment.page.html"
  # admin surface of the module (created alongside the partner side)
  "crm-prototype/assets/js/invest-data.js"
  "crm-prototype/assets/js/invest.js"
  "crm-prototype/screens/B11-investment-records.html"
)

# Amount-marker discipline is enforced only where amounts are DATA, not copy.
AMOUNT_DATA_FILES=(
  "app/assets/js/partner-invest.js"
  "crm-prototype/assets/js/invest-data.js"
)

# --- patterns --------------------------------------------------------------
# (A) risk terms — promissory/projective ideas. Allowed ONLY when negated.
#     Case-insensitive. Kept deliberately broad; negation-awareness prevents
#     false positives on the disciplined copy.
RISK='guaranteed|guarantee|assured|risk[ -]?free|projected|projection|forecast|invest now|profit|yield|payout|disburse|disbursement'

# Negation / allow tokens. If any appears on the same line as a risk term, the
# line is treated as legitimate negating/prohibition copy. Bengali included.
NEG='\bno\b|\bnot\b|\bnever\b|\bwithout\b|n.t\b|cannot|prohibit|does not|do not|নয়|না\b|নেই|guard-ok'

# (B) hard mechanism patterns — a payout/disburse button or a return calculator.
#     These are structural; no negation exception.
MECH='calculateReturn|projectReturn|computeReturn|returnRate\s*[*]|[*]\s*returnRate|onclick="?[a-zA-Z]*[Pp]ayout|onclick="?[a-zA-Z]*[Dd]isburse|next[ -]payment[ -]due|running[ -]total'

FAIL=0
REPORT=""

add(){ REPORT="${REPORT}$1"$'\n'; }

add "── With-Investment prohibition guard ─────────────────────────────"

# ---- (A) negation-aware promise/projection scan ----
A_HITS=0
for rel in "${MODULE_FILES[@]}"; do
  f="$ROOT/$rel"
  [ -f "$f" ] || continue
  while IFS=: read -r ln text; do
    [ -z "${ln:-}" ] && continue
    # allow the line if it carries a negation/prohibition/allow token
    if echo "$text" | grep -qiE "$NEG"; then continue; fi
    # allow comment lines — comments never render, so a term there is not a
    # promise SHOWN to anyone (the module's own header documents the ban).
    if echo "$text" | grep -qE '^[[:space:]]*(\*|//|/\*|<!--)'; then continue; fi
    A_HITS=$((A_HITS+1))
    add "  ✗ [A promise-language] $rel:$ln — $(echo "$text" | sed 's/^[[:space:]]*//' | cut -c1-90)"
  done < <(grep -niE "$RISK" "$f" 2>/dev/null)
done

# ---- (B) mechanism scan ----
B_HITS=0
for rel in "${MODULE_FILES[@]}"; do
  f="$ROOT/$rel"
  [ -f "$f" ] || continue
  while IFS=: read -r ln text; do
    [ -z "${ln:-}" ] && continue
    B_HITS=$((B_HITS+1))
    add "  ✗ [B payout/calc mechanism] $rel:$ln — $(echo "$text" | sed 's/^[[:space:]]*//' | cut -c1-90)"
  done < <(grep -niE "$MECH" "$f" 2>/dev/null)
done

# ---- (C) amount-marker discipline: no real return/investment amount in DATA ----
# Any non-null numeric `amountBdt: 12345` (or amount: 12345) in an amount-data
# file means a legally-consequential value is being shown before legal sign-off.
C_HITS=0
for rel in "${AMOUNT_DATA_FILES[@]}"; do
  f="$ROOT/$rel"
  [ -f "$f" ] || continue
  while IFS=: read -r ln text; do
    [ -z "${ln:-}" ] && continue
    C_HITS=$((C_HITS+1))
    add "  ✗ [C unmarked amount] $rel:$ln — $(echo "$text" | sed 's/^[[:space:]]*//' | cut -c1-90)"
  done < <(grep -niE "(amountBdt|amount)[[:space:]]*:[[:space:]]*[0-9]" "$f" 2>/dev/null)
done

# ---- positive invariant: the marker must actually be present in the module ----
MARKER='LEGAL SIGN-OFF REQUIRED'
if ! LC_ALL=C grep -qF "$MARKER" "$ROOT/app/assets/js/partner-invest.js" 2>/dev/null; then
  add "  ✗ [C marker missing] partner-invest.js does not contain the '[AMOUNT — LEGAL SIGN-OFF REQUIRED]' marker"
  C_HITS=$((C_HITS+1))
fi

TOTAL=$((A_HITS+B_HITS+C_HITS))
add "───────────────────────────────────────────────────────────────────"
add "  A promise-language: $A_HITS   B mechanism: $B_HITS   C unmarked-amount: $C_HITS"

printf '%s\n' "$REPORT"

if [ "$TOTAL" -eq 0 ]; then
  echo "PASS — the fence holds: no promise-language, no payout/calc mechanism, every amount held as a marker."
  printf '{"check":"invest-prohibition-guard","pass":true,"promise":0,"mechanism":0,"unmarked_amount":0}\n'
  exit 0
else
  echo "FAIL — the With-Investment fence is breached ($TOTAL issue(s)). See ✗ lines above."
  printf '{"check":"invest-prohibition-guard","pass":false,"promise":%d,"mechanism":%d,"unmarked_amount":%d}\n' "$A_HITS" "$B_HITS" "$C_HITS"
  exit 1
fi
