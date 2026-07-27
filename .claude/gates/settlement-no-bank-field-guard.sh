#!/bin/bash
# settlement-no-bank-field-guard.sh — the fence around the Settlement module (Req 6.13).
#
# The safety of this module IS the absence of a bank field, made intentional. The
# app records a REQUEST (an amount) and, later, that finance PAID IT EXTERNALLY —
# it never moves money and never holds a payment destination. Clause 6.13.2:
#   "No bank / MFS / card / merchant account details collected or stored,
#    mobile or CRM."
#
# This guard makes that mechanical: it FAILS the build if any settlement-surface
# file contains a field that would collect or store a payment destination —
# IBAN, account number/holder, card/PAN, sort/SWIFT/routing code, bank account
# number/name, MFS/wallet number.
#
# NEGATION-AWARE: the disciplined copy names these ideas to negate them ("NOT an
# account number", "there is deliberately no bank field", "no account details are
# needed"). A line carrying a negation token — or the inline opt-out `guard-ok` —
# is allowed. The bare word "Bank" is fine: it is a channel *category* option
# (Cash / Bank / bKash / Nagad / Cheque / Other), not an account field, so the
# guard matches only "bank account/number/name/details", never "Bank" alone.
#
# Usage:   bash .claude/gates/settlement-no-bank-field-guard.sh [repo_root]
# Exit 0 = PASS, 1 = FAIL.

set -u
ROOT="${1:-.}"
ROOT="$(cd "$ROOT" 2>/dev/null && pwd)" || { echo "guard: repo root not found"; exit 1; }

# --- settlement surface (all three surfaces) -------------------------------
FILES=(
  "app/partner/request-settlement.page.html"
  "app/partner/settlement-status.page.html"
  "app/partner/settlement-submitted.page.html"
  "app/partner/settlement-history.page.html"
  "app/assets/js/settlement-state.js"
  "app/assets/js/partner-ledger.js"
  "crm-prototype/assets/js/commission-data.js"
  "crm-prototype/assets/js/commission.js"
  "crm-prototype/screens/M01-settlement-queue.html"
  "crm-prototype/screens/M02-settlement-decision.html"
  "crm-prototype/screens/M03-mark-settled.html"
  "crm-prototype/screens/M04-settlement-history.html"
  "demo/server.js"
  "demo/public/partner/app.js"
  "demo/public/admin/app.js"
)

# Payment-destination field patterns. Deliberately targets account-bearing forms,
# NOT the bare category word "Bank".
BANK='iban|swift|routing|sort[ -]?code|account[ -]?(number|no|holder)|\bacc[ -]?no\b|card[ -]?(number|no)|\bpan\b|bank[ -]?(account|number|name|details)|mfs[ -]?(number|account)|wallet[ -]?number|merchant[ -]?(account|id)'

# Negation / allow tokens (EN + BN). A line with any of these is legitimate
# negating/prohibition/label copy, not a field.
NEG='\bno\b|\bnot\b|\bnever\b|\bwithout\b|deliberately|non-sensitive|category|categories|prohibit|নয়|না\b|নেই|guard-ok'

FAIL=0
REPORT=""
add(){ REPORT="${REPORT}$1"$'\n'; }
add "── Settlement no-bank-field guard ────────────────────────────────"

HITS=0
SCANNED=0
for rel in "${FILES[@]}"; do
  f="$ROOT/$rel"
  [ -f "$f" ] || continue
  SCANNED=$((SCANNED+1))
  while IFS=: read -r ln text; do
    [ -z "${ln:-}" ] && continue
    if echo "$text" | grep -qiE "$NEG"; then continue; fi
    if echo "$text" | grep -qE '^[[:space:]]*(\*|//|/\*|<!--|#)'; then continue; fi
    HITS=$((HITS+1))
    add "  ✗ [bank/account field] $rel:$ln — $(echo "$text" | sed 's/^[[:space:]]*//' | cut -c1-90)"
  done < <(grep -niE "$BANK" "$f" 2>/dev/null)
done

# positive invariant: the "absence is intentional" framing must be present on the
# partner request screen — the standout that makes the missing field a feature.
if ! LC_ALL=C grep -qiE "no bank|agreed method|no account" "$ROOT/app/partner/request-settlement.page.html" 2>/dev/null; then
  add "  ✗ [framing missing] request-settlement.page.html does not frame the absent bank field as intentional"
  HITS=$((HITS+1))
fi

add "──────────────────────────────────────────────────────────────────"
add "  files scanned: $SCANNED   bank/account fields: $HITS"
printf '%s\n' "$REPORT"

if [ "$HITS" -eq 0 ]; then
  echo "PASS — no bank / account / MFS / card field anywhere in the settlement surface; the absence is framed as intentional."
  printf '{"check":"settlement-no-bank-field-guard","pass":true,"bank_fields":0,"files":%d}\n' "$SCANNED"
  exit 0
else
  echo "FAIL — the settlement surface leaks a payment-destination field ($HITS). See ✗ lines above."
  printf '{"check":"settlement-no-bank-field-guard","pass":false,"bank_fields":%d,"files":%d}\n' "$HITS" "$SCANNED"
  exit 1
fi
