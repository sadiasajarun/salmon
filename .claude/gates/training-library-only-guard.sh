#!/bin/bash
# training-library-only-guard.sh — the fence around Training & Sales Kit (Req 6.15).
#
# Clause 6.15.5: this is a content LIBRARY, not an LMS. No quizzes, no
# certification, no pass/fail, no completion tracking beyond a simple "viewed"
# marker. The client asked for a learning *vibe*, not course machinery.
#
# This guard fails the build if the training/kit surface grows LMS artifacts:
# quiz, certificate/certification, pass-fail, exam, grade/marks, completion
# %/rate, progress ring, "N of M complete", enrol-in-course.
#
# NEGATION-AWARE: the module's own copy names these to forbid them ("NO quizzes,
# scores, or certificates", "NOT an LMS", "there is no test or score"). A line
# with a negation token, or a comment line, is allowed. "viewed" and a plain
# "New" badge are the only permitted progress markers and are not matched.
#
# Usage:   bash .claude/gates/training-library-only-guard.sh [repo_root]
# Exit 0 = PASS, 1 = FAIL.

set -u
ROOT="${1:-.}"
ROOT="$(cd "$ROOT" 2>/dev/null && pwd)" || { echo "guard: repo root not found"; exit 1; }

FILES=(
  "app/assets/js/partner-training.js"
  "app/assets/js/partner-kit.js"
  "app/partner/training-library.page.html"
  "app/partner/content-viewer.page.html"
  "app/partner/training-downloads.page.html"
  "app/partner/sales-kit.page.html"
  "app/partner/gated.page.html"
  "crm-prototype/assets/js/content-data.js"
  "crm-prototype/assets/js/content.js"
  "crm-prototype/screens/Y01-content-management.html"
)

# LMS artifacts. "score" is intentionally NOT a bare match (too noisy — appears in
# unrelated code); we match scoring only in course-y compounds.
LMS='quiz|certificat|pass[ /-]?fail|\bexam\b|\bgrade[sd]?\b|marks?[ -]obtained|completion[ -]?(%|percent|rate|status)|progress[ -]?ring|[0-9]+[ ]*of[ ]*[0-9]+[ ]*(modules?|lessons?)[ ]*complete|enrol(l)?(ment)?[ -]?in[ -]?(a[ -]?)?course|final[ -]?score'

NEG='\bno\b|\bnot\b|\bnever\b|\bwithout\b|deliberately|prohibit|library only|নয়|না\b|নেই|guard-ok'

FAIL=0; REPORT=""
add(){ REPORT="${REPORT}$1"$'\n'; }
add "── Training library-only (no-LMS) guard ──────────────────────────"

HITS=0; SCANNED=0
for rel in "${FILES[@]}"; do
  f="$ROOT/$rel"; [ -f "$f" ] || continue
  SCANNED=$((SCANNED+1))
  while IFS=: read -r ln text; do
    [ -z "${ln:-}" ] && continue
    if echo "$text" | grep -qiE "$NEG"; then continue; fi
    if echo "$text" | grep -qE '^[[:space:]]*(\*|//|/\*|<!--|#)'; then continue; fi
    HITS=$((HITS+1))
    add "  ✗ [LMS artifact] $rel:$ln — $(echo "$text" | sed 's/^[[:space:]]*//' | cut -c1-90)"
  done < <(grep -niE "$LMS" "$f" 2>/dev/null)
done

# positive invariant: the "library, not an LMS" framing must be present.
if ! LC_ALL=C grep -qiE "not an lms|no quizz|library only|reference library" "$ROOT/app/assets/js/partner-training.js" 2>/dev/null; then
  add "  ✗ [framing missing] partner-training.js does not state it is a library, not an LMS"
  HITS=$((HITS+1))
fi

add "──────────────────────────────────────────────────────────────────"
add "  files scanned: $SCANNED   LMS artifacts: $HITS"
printf '%s\n' "$REPORT"

if [ "$HITS" -eq 0 ]; then
  echo "PASS — a content library, not an LMS: no quiz/certification/pass-fail/completion machinery; 'viewed' is the only marker."
  printf '{"check":"training-library-only-guard","pass":true,"lms_artifacts":0,"files":%d}\n' "$SCANNED"
  exit 0
else
  echo "FAIL — LMS machinery detected in the training/kit surface ($HITS). See ✗ lines above."
  printf '{"check":"training-library-only-guard","pass":false,"lms_artifacts":%d,"files":%d}\n' "$HITS" "$SCANNED"
  exit 1
fi
