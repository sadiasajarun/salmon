/* ============================================================================
 * Salmon CRM — Permission model (server-side-shaped)
 * ----------------------------------------------------------------------------
 * The UI hides items for UX; it NEVER assumes hiding is security. Every action
 * and every module-view is a NAMED permission. can() gates buttons/nav;
 * requirePermission() is what the mock backend calls before it mutates anything
 * (throws if denied) — this is the shape the Laravel policy layer inherits later.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    FINANCE: 'FINANCE',
    LEGAL: 'LEGAL'
  };
  var ALL = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL];

  // Human labels for each role.
  var ROLE_LABEL = {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    FINANCE: 'Finance Officer',
    LEGAL: 'Legal / Document Controller'
  };

  // Every action + every module-view is a permission mapped to the roles that hold it.
  var CAN = {
    // --- module views (gate entry to a route) ---
    VIEW_DASHBOARD:      ALL,
    VIEW_PEOPLE:         [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.LEGAL],
    VIEW_PIPELINE:       [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    VIEW_CATALOGUE:      [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE],
    VIEW_FINANCE:        [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    VIEW_DOCUMENTS:      [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    VIEW_COMMUNICATIONS: [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    VIEW_USERS:          [ROLES.SUPER_ADMIN],
    VIEW_SETTINGS:       [ROLES.SUPER_ADMIN],
    VIEW_AUDIT_LOG:      [ROLES.SUPER_ADMIN],

    // --- consequential actions ---
    APPROVE_PARTNER:     [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    VERIFY_CONVERSION:   [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    CONFIRM_MEETING:     [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    VERIFY_KYC:          [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    CLASSIFY_DOC:        [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    PUBLISH_DOC:         [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    UPLOAD_LEGAL_DOC:    [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    RECONCILE_PAYMENT:   [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    VERIFY_WIRE:         [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    APPROVE_COMMISSION:  [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    RELEASE_SETTLEMENT:  [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    HOLD_SETTLEMENT:     [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    PUBLISH_PROJECT:     [ROLES.SUPER_ADMIN],
    MANAGE_INVENTORY:    [ROLES.SUPER_ADMIN, ROLES.MANAGER],   // widened for Part 3 catalogue (was SUPER_ADMIN only)
    EXPORT_SUMMARY_CSV:  [ROLES.SUPER_ADMIN],

    // --- People & Access (Part 2) — added by the module, not a fork of Part 1 ---
    // APPROVE_PARTNER already defined above (SUPER_ADMIN, MANAGER).
    REJECT_PARTNER:       [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    SUSPEND_PARTNER:      [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    ASSIGN_TERRITORY:     [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    ASSIGN_RANK:          [ROLES.SUPER_ADMIN],           // rank is admin-only — logged as OPEN_QUESTIONS #8
    EDIT_PARTNER_PROFILE: [ROLES.SUPER_ADMIN, ROLES.MANAGER],

    REVIEW_KYC:           [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    VIEW_KYC_DOCUMENT:    [ROLES.SUPER_ADMIN, ROLES.LEGAL],    // even viewing is gated + logged
    EDIT_CLIENT_PROFILE:  [ROLES.SUPER_ADMIN, ROLES.MANAGER],

    MANAGE_TERRITORY:     [ROLES.SUPER_ADMIN],
    MANAGE_TEAM:          [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    MOVE_PARTNER:         [ROLES.SUPER_ADMIN],
    GENERATE_REFERRAL:    [ROLES.SUPER_ADMIN, ROLES.MANAGER],

    // --- Catalogue & Inventory (Part 3) ---
    // PUBLISH_PROJECT + MANAGE_INVENTORY defined above (MANAGE_INVENTORY widened to include MANAGER).
    CREATE_PROJECT:       [ROLES.SUPER_ADMIN],
    EDIT_PROJECT:         [ROLES.SUPER_ADMIN],
    UPLOAD_MEDIA:         [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    POST_CONSTRUCTION:    [ROLES.SUPER_ADMIN, ROLES.MANAGER],

    // --- Sales Pipeline (Part 4) ---
    // VERIFY_CONVERSION + CONFIRM_MEETING already defined above (SUPER_ADMIN, MANAGER).
    VIEW_LEAD:            [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    UPDATE_LEAD_STATUS:   [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    REJECT_LEAD:          [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    MANAGE_MEETING:       [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    MANAGE_CONSULTATION:  [ROLES.SUPER_ADMIN, ROLES.MANAGER],

    // --- Finance Core (Part 5) ---
    // VERIFY_WIRE already defined above (SUPER_ADMIN, FINANCE).
    VIEW_PAYMENTS:        [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    CONFIRM_WEBHOOK:      [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    REJECT_PAYMENT:       [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    GENERATE_INVOICE:     [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    TRIGGER_REMINDER:     [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER],
    RECORD_REFUND:        [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    VIEW_LEDGER:          [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER],

    // --- Commission & Settlement (Part 6) — partner payout desk ---
    // APPROVE_COMMISSION already defined above (SUPER_ADMIN, FINANCE).
    VIEW_COMMISSION:      [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER],  // manager sees, doesn't approve
    ADJUST_COMMISSION:    [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    VIEW_SETTLEMENT:      [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    APPROVE_SETTLEMENT:   [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    REJECT_SETTLEMENT:    [ROLES.SUPER_ADMIN, ROLES.FINANCE],
    MARK_SETTLED:         [ROLES.SUPER_ADMIN, ROLES.FINANCE],

    // --- Documents, Communications, Reporting (Part 7) ---
    // VIEW_DOCUMENTS already defined above (SUPER_ADMIN, LEGAL) — gates the repository.
    // Per-DOCUMENT viewing is gated by canView(role, classification), NOT a static list.
    UPLOAD_DOCUMENT:      [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    CHANGE_VISIBILITY:    [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    ARCHIVE_DOCUMENT:     [ROLES.SUPER_ADMIN, ROLES.LEGAL],
    VIEW_ACCESS_LOG:      [ROLES.SUPER_ADMIN, ROLES.LEGAL],

    VIEW_TICKETS:         [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL],
    ASSIGN_TICKET:        [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    REPLY_TICKET:         [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL], // + assigned-owner check in code
    CLOSE_TICKET:         [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL], // + assigned-owner check in code

    MANAGE_NOTICES:       [ROLES.SUPER_ADMIN, ROLES.MANAGER],
    PUBLISH_NOTICE:       [ROLES.SUPER_ADMIN],

    VIEW_REPORT:          [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE],
    EXPORT_REPORT:        [ROLES.SUPER_ADMIN, ROLES.FINANCE],   // only where the report is exportable=true

    // --- Hardening (Part 8) — almost entirely Super-Admin ---
    // VIEW_AUDIT_LOG / VIEW_USERS / VIEW_SETTINGS already defined above (SUPER_ADMIN).
    EXPORT_AUDIT_LOG:     [ROLES.SUPER_ADMIN],
    MANAGE_STAFF_USER:    [ROLES.SUPER_ADMIN],
    ASSIGN_ROLE:          [ROLES.SUPER_ADMIN],
    DEACTIVATE_USER:      [ROLES.SUPER_ADMIN],
    MANAGE_CONFIG:        [ROLES.SUPER_ADMIN],
    SET_GATEWAY_STATUS:   [ROLES.SUPER_ADMIN],
    SET_MIN_APP_VERSION:  [ROLES.SUPER_ADMIN],
    EDIT_INVOICE_TEMPLATE:[ROLES.SUPER_ADMIN],
    MANAGE_NOTIF_TEMPLATE:[ROLES.SUPER_ADMIN],
    TEST_NOTIF_TEMPLATE:  [ROLES.SUPER_ADMIN]
  };

  // Document visibility gate — classification × role, SEPARATE from hasRole().
  // A Manager can see Partner-visible/Internal docs but NOT Legal-Finance or Customer-restricted.
  var DOC_VISIBILITY = {
    'Internal':            [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL],
    'Partner-visible':     [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.LEGAL],
    'Legal-Finance':       [ROLES.SUPER_ADMIN, ROLES.LEGAL, ROLES.FINANCE],
    'Customer-restricted': [ROLES.SUPER_ADMIN, ROLES.LEGAL]
  };
  function canView(role, classification){ var a = DOC_VISIBILITY[classification]; return !!a && a.indexOf(role) > -1; }

  function can(role, action) {
    var allowed = CAN[action];
    if (!allowed) { console.warn('[perm] unknown action:', action); return false; }
    return allowed.indexOf(role) > -1;
  }

  // Mock-backend guard. Throws a typed error the router/handlers catch → A03 / toast.
  function requirePermission(role, action) {
    if (!can(role, action)) {
      var e = new Error('PERMISSION_DENIED: ' + role + ' cannot ' + action);
      e.code = 'PERMISSION_DENIED';
      e.action = action;
      e.role = role;
      throw e;
    }
    return true;
  }

  root.Perm = {
    ROLES: ROLES, ALL: ALL, ROLE_LABEL: ROLE_LABEL, CAN: CAN,
    can: can, requirePermission: requirePermission,
    DOC_VISIBILITY: DOC_VISIBILITY, canView: canView
  };
})(window);
