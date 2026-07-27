/* ============================================================================
 * Salmon CRM — role-aware navigation + permission gate.
 * The sidebar is GENERATED from getSidebarFor(role) — four roles, four rails.
 * Never one rail with items hidden by CSS. Entry to every module is gated.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var Perm = root.Perm, CRM = root.CRM;

  // module registry: id -> nav definition
  var NAV = {
    dashboard:      { label: 'Home',           icon: '⌂', route: '#/dashboard',      perm: 'VIEW_DASHBOARD' },
    pipeline:       { label: 'Sales Pipeline', icon: '◫', route: '#/pipeline',       perm: 'VIEW_PIPELINE',       part: 2 },
    people:         { label: 'People',         icon: '⚇', route: '#/people',         perm: 'VIEW_PEOPLE',         part: 2 },
    catalogue:      { label: 'Catalogue',      icon: '▣', route: '#/catalogue',      perm: 'VIEW_CATALOGUE',      part: 3 },
    finance:        { label: 'Finance',        icon: '₿', route: '#/finance',        perm: 'VIEW_FINANCE',        part: 4 },
    documents:      { label: 'Documents',      icon: '▤', route: '#/documents',      perm: 'VIEW_DOCUMENTS',      part: 5 },
    communications: { label: 'Communications', icon: '✉', route: '#/communications', perm: 'VIEW_COMMUNICATIONS',  part: 6 },
    reporting:      { label: 'Reports',        icon: '◱', route: '#/reporting',      perm: 'VIEW_REPORT',         part: 7 },
    users:          { label: 'Users & Roles',  icon: '⚙', route: '#/users',          perm: 'VIEW_USERS',          part: 7 },
    audit:          { label: 'Audit Log',      icon: '☰', route: '#/audit',          perm: 'VIEW_AUDIT_LOG',      part: 7 },
    settings:       { label: 'Settings',       icon: '⚙', route: '#/settings',       perm: 'VIEW_SETTINGS',       part: 7 }
  };

  // per-role sidebar composition (Work / Explore / Team) — genuinely different rails
  var SIDEBAR = {
    SUPER_ADMIN: { Work: ['dashboard', 'pipeline', 'finance', 'documents'], Explore: ['people', 'catalogue', 'communications', 'reporting'], Team: ['users', 'audit', 'settings'] },
    MANAGER:     { Work: ['dashboard', 'pipeline', 'communications'],       Explore: ['people', 'catalogue', 'reporting'],        Team: [] },
    FINANCE:     { Work: ['dashboard', 'finance'],                          Explore: ['catalogue', 'reporting'],                  Team: [] },
    LEGAL:       { Work: ['dashboard', 'documents'],                        Explore: ['people'],                                  Team: [] }
  };

  // small badge counts for the role's work queues
  function navCount(id) {
    switch (id) {
      case 'pipeline': return CRM.leadsAwaiting.length;
      case 'finance': return CRM.settlementRequests.filter(function (s) { return s.status === 'submitted'; }).length;
      case 'documents': return CRM.kycQueue.length;
      case 'people': return CRM.partnerApplications.length;
      case 'communications': return 1;
      default: return 0;
    }
  }

  function getSidebarFor(role) {
    var groups = [];
    var comp = SIDEBAR[role] || {};
    Object.keys(comp).forEach(function (g) {
      var items = comp[g]
        .filter(function (id) { return Perm.can(role, NAV[id].perm); })   // defensive: never show what perm denies
        .map(function (id) { return { id: id, label: NAV[id].label, icon: NAV[id].icon, route: NAV[id].route, count: navCount(id) }; });
      if (items.length) groups.push({ title: g, items: items });
    });
    return groups;
  }

  // resolve a hash to a route descriptor
  function resolve(hash) {
    var id = (hash || '').replace(/^#\//, '').split('?')[0] || 'dashboard';
    if (id === 'access-denied') return { kind: 'denied' };
    if (id === 'session-expired') return { kind: 'session' };
    if (id === 'dashboard' || id === '') return { kind: 'dashboard', id: 'dashboard' };
    if (NAV[id]) return { kind: 'module', id: id, nav: NAV[id] };
    return { kind: 'dashboard', id: 'dashboard' };
  }

  function breadcrumbFor(role, res, dashName) {
    if (res.kind === 'dashboard') return [{ label: 'Salmon', route: '#/dashboard' }, { label: dashName || 'Home', cur: true }];
    if (res.kind === 'module') return [{ label: 'Salmon', route: '#/dashboard' }, { label: res.nav.label, cur: true }];
    if (res.kind === 'denied') return [{ label: 'Salmon', route: '#/dashboard' }, { label: 'Access denied', cur: true }];
    return [{ label: 'Salmon', cur: true }];
  }

  root.Router = { NAV: NAV, SIDEBAR: SIDEBAR, getSidebarFor: getSidebarFor, resolve: resolve, breadcrumbFor: breadcrumbFor, navCount: navCount };
})(window);
