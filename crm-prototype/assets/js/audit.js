/* ============================================================================
 * Salmon CRM — Audit emission (invisible layer, wired from Part 1)
 * ----------------------------------------------------------------------------
 * "Humans decide, software records." Every meaningful action calls audit().
 * There is no audit SCREEN in Part 1 (that's a later Super-Admin module) — but
 * the emission is wired now so the shape is already right for Laravel, and the
 * dashboard highlight panels (A05/A08) read from this store.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var auditStore = [];
  // Part 8: the audit ledger is now PERSISTED to localStorage so the audit-log
  // UI (S01) can show every entry any module emitted — not just this page's.
  // A single global sequence counter (persisted) keeps ids unique across pages.
  var PKEY = 'crm_audit', SKEY = 'crm_audit_seq', CAP = 900;
  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v==null?d:JSON.parse(v); } catch(e){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  var seq = Math.max(1000, lsGet(SKEY, 1000));

  // Deterministic-ish id/time: prototype has no real clock authority, so we
  // stamp against a fixed "now" the app sets, plus a monotonic counter.
  function nowIso() { return (root.CRM_NOW || '2026-07-15T10:00:00Z'); }

  function audit(entry) {
    var actor = entry.actor || {};
    var rec = {
      id: 'AUD-' + (++seq),
      timestamp: entry.timestamp || nowIso(),
      actor: actor.name || actor || 'system',
      actorRole: actor.role || entry.actorRole || '—',
      action: entry.action,
      target: entry.target || '',
      changes: entry.changes || null
    };
    auditStore.unshift(rec); // newest first (this page)
    // persist to the shared ledger (newest first, capped)
    var log = lsGet(PKEY, []); log.unshift(rec); if (log.length > CAP) log = log.slice(0, CAP);
    lsSet(PKEY, log); lsSet(SKEY, seq);
    // Visible proof the emission fired (grep the store or the console for [AUDIT]).
    console.log('[AUDIT]', rec.action, '·', rec.target, '·', rec.actor, '(' + rec.actorRole + ')', rec);
    document.dispatchEvent(new CustomEvent('audit', { detail: rec }));
    return rec;
  }

  function recent(n) { return auditStore.slice(0, n || 10); }
  function all() { return auditStore.slice(); }
  function seed(entries) { (entries || []).forEach(function (e) { auditStore.push(e); }); }

  // Full persisted ledger for the audit-log UI: persisted entries + any seed
  // entries not already persisted, deduped by id, newest first.
  function fullLog() {
    var out = lsGet(PKEY, []).slice();
    var seen = {}; out.forEach(function (r) { seen[r.id] = true; });
    auditStore.forEach(function (r) { if (!seen[r.id]) { seen[r.id] = true; out.push(r); } });
    return out.sort(function (a, b) { return (a.timestamp < b.timestamp) ? 1 : (a.timestamp > b.timestamp) ? -1 : 0; });
  }
  function clearPersisted() { lsSet(PKEY, []); }

  root.Audit = { audit: audit, recent: recent, all: all, seed: seed, store: auditStore, fullLog: fullLog, clearPersisted: clearPersisted };
})(window);
