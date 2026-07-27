/* ============================================================================
 * Salmon Live Demo — one store, two views.
 * A single Express process serves the client mobile app + admin panel and holds
 * all state in data.json. Real-time updates travel over Server-Sent Events:
 * every mutation broadcasts a delta to all connected browsers.
 * ==========================================================================*/
'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const Geo = require('./public/shared/geo.js'); // Division › District › Upazila › Union

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const SEED_PATH = path.join(ROOT, 'data.seed.json');
const DATA_PATH = path.join(ROOT, 'data.json');

// ---------------------------------------------------------------------------
// Store — load seed into data.json on first run, then read/write that file.
// ---------------------------------------------------------------------------
function loadSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
}
function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(loadSeed(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function save() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

let db = loadData();

// ---------------------------------------------------------------------------
// Program participation (Req 6.3) — a PER-PROGRAM record, distinct from the
// partner's ACCOUNT status. Each of {zero, with} carries its own status,
// enrolment date and history. The legacy `partner.program` string is DERIVED
// from this and rewritten on every change (never the source of truth).
// ---------------------------------------------------------------------------
const PARTICIPATION_STATUSES = ['notEnrolled', 'active', 'suspended', 'closed'];

function mkPart(active, at) {
  return active
    ? { status: 'active', enrolledAt: at || new Date().toISOString(), requestedAt: null, history: [{ status: 'active', at: at || new Date().toISOString(), reason: null, by: 'Seed' }] }
    : { status: 'notEnrolled', enrolledAt: null, requestedAt: null, history: [] };
}

// Back-fill participation from the legacy `program` string when a partner
// predates the model. Idempotent — runs on every load and reset.
function normalizeDb(store) {
  (store.partners || []).forEach(function (p) {
    if (!p.participation) {
      const at = p.createdAt || new Date().toISOString();
      p.participation = {
        zero: mkPart(p.program === 'zero' || p.program === 'both', at),
        with: mkPart(p.program === 'with' || p.program === 'both', at)
      };
    }
    // demo: enrol one partner in BOTH programs so the combined dashboard is visible
    if (p.name === 'Karim Rahman' && p.participation && p.participation.with && p.participation.with.status !== 'active') {
      p.participation.with = mkPart(true, p.createdAt || new Date().toISOString());
    }
    syncProgramString(p);
    // Back-fill the structured operating territory (Division › District › Upazila
    // › Union) from the legacy single-string `territory`. Idempotent.
    if (!p.geo || !(p.geo.district || p.geo.division)) p.geo = Geo.fromName(p.territory);
    if (p.card) p.card.geo = p.geo;
    // With-Investment record (recorded offline by Salmon; NEVER a guaranteed return,
    // never mixed with the commission balance). Representative demo figures for
    // active With partners; others carry none until staff record one.
    if (p.invest === undefined) {
      p.invest = (p.participation && p.participation.with && p.participation.with.status === 'active')
        ? { salesVolumeBdt: 4200000, investedBdt: 3000000, effectiveDate: '2026-01-15', terms: 'Client-approved commercial terms (recorded offline)', schedule: 'Client-approved 12% p.a. · quarterly schedule',
            returnPaidBdt: 180000, returnPendingBdt: 90000, returnOnHoldBdt: 0,
            entries: [
              { period: 'Q1 2026', amountBdt: 90000, status: 'paid', at: '2026-04-01T00:00:00.000Z', reason: 'Seed', by: 'Finance' },
              { period: 'Q2 2026', amountBdt: 90000, status: 'paid', at: '2026-07-01T00:00:00.000Z', reason: 'Seed', by: 'Finance' },
              { period: 'Q3 2026', amountBdt: 90000, status: 'pending', at: '2026-07-01T00:00:00.000Z', reason: 'Seed', by: 'Finance' }
            ] }
        : null;
    }
  });
  store.investmentInterests = store.investmentInterests || [];
  (store.applications || []).forEach(function (a) {
    if (!a.geo || !(a.geo.district || a.geo.division)) a.geo = Geo.fromName(a.territory);
  });
  (store.leads || []).forEach(function (l) {
    if (l.leadType == null) l.leadType = 'buyer';   // 6.4 — buyer vs investor
    if (l.email == null) l.email = '';
  });
  // Back-fill property media (Req 6.5 property view — video / 360 / floor plan).
  // Real photos live in `gallery`; video/360 are clearly-labelled SAMPLE assets a
  // prototype can show until Salmon supplies the project's own. floorPlan:true =>
  // the client renders a schematic placeholder. Idempotent.
  (store.projects || []).forEach(function (pr) {
    pr.media = pr.media || {};
    if (pr.media.video == null) pr.media.video = { url: SAMPLE_MEDIA.video, sample: true };
    if (pr.media.tour360 == null) pr.media.tour360 = { url: SAMPLE_MEDIA.tour360, sample: true };
    if (pr.media.floorPlan == null) pr.media.floorPlan = { schematic: true, sample: true };
    if (pr.media.brochure == null) pr.media.brochure = { name: pr.name + ' — Sales Brochure.pdf', url: '#', approved: true }; // admin-published sales kit
    // sample gallery placeholders (like the HTML prototype) until Salmon supplies real photos
    if (!pr.gallery || !pr.gallery.length) pr.gallery = SAMPLE_MEDIA.gallery.slice();
    // Req: configurable property category + publish state + civic amenities.
    if (pr.category == null) pr.category = 'Apartment / Flat';
    if (pr.published == null) pr.published = true; // seeded projects are live
    if (pr.summary == null) pr.summary = pr.tagline || '';
    if (pr.amenities == null) pr.amenities = ['Lift', '24/7 Security', 'Parking'];
    if (pr.contact == null) pr.contact = { phone: '09610-SALMON', visit: 'By appointment · sales office' };
  });
}
// Sample media used only where Salmon has not supplied the project's own assets.
const SAMPLE_MEDIA = {
  video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  tour360: 'https://my.matterport.com/show/?m=SxQL3iGyoDo',
  // stable placeholder building photos (prototype dummy imagery)
  gallery: ['https://picsum.photos/seed/salmon-a/640/420', 'https://picsum.photos/seed/salmon-b/640/420', 'https://picsum.photos/seed/salmon-c/640/420']
};

// Derive the legacy program label from active participation only.
function deriveProgram(participation) {
  const z = participation.zero && participation.zero.status === 'active';
  const w = participation.with && participation.with.status === 'active';
  return z && w ? 'both' : w ? 'with' : z ? 'zero' : 'none';
}
function syncProgramString(p) {
  const prog = deriveProgram(p.participation);
  p.program = prog;
  if (p.card) p.card.program = prog;
}

normalizeDb(db);

// ===========================================================================
// Req 6.7 — Secure Project, Legal & Customer Document Repository.
// The value of this module is NOT its UI: it is that every file is encrypted,
// access-controlled, audit-logged, malware-scanned, versioned and retained.
// The security clauses (6.7.5/6.7.7/6.7.9) are MODELLED here with the correct
// production shape even where the implementation is mocked, so the real build
// is a fill-in (swap the mock scanner / bucket / backup) rather than a redesign.
// ---------------------------------------------------------------------------
const crypto = require('crypto');

// Four-level classification (6.7.4). Order is least→most restrictive audience.
const DOC_CLASSIFICATIONS = ['internalOnly', 'legalFinanceRestricted', 'partnerVisible', 'customerLeadRestricted'];
// Upload safety pipeline states (6.7.7). Only `clean` is ever accessible.
const DOC_SCAN_STATES = ['uploading', 'scanning', 'clean', 'quarantined', 'rejected'];
// Verification/publication status (6.7.8) — set BY A HUMAN legal officer (6.7.11).
const DOC_VERIFICATION_STATES = ['uploaded', 'underReview', 'verified', 'rejected', 'superseded'];
// Lifecycle (6.7.9). Nothing is ever hard-deleted.
const DOC_LIFECYCLE_STATES = ['active', 'archived', 'deleted'];

const CLASSIFICATION_LABEL = {
  internalOnly: 'Internal only',
  legalFinanceRestricted: 'Legal / Finance restricted',
  partnerVisible: 'Partner-visible',
  customerLeadRestricted: 'Customer / Lead restricted'
};

// Configurable document-type registry (6.7.1, 6.7.2). Salmon can extend this —
// each type carries its family (legal vs customer), default classification, who
// may upload it, allowed file types + size, and a retention period. NOT a
// hardcoded flat list; the Bengali terms (dolil, porcha, khajna) are what
// Salmon's legal team actually uses.
function defaultDocRegistry() {
  return [
    // -- Project / legal documents — uploaded by Legal / Document Controller --
    { code: 'title_deed', family: 'legal', label: 'Title deed / Dolil', labelBn: 'দলিল', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'], maxSizeKb: 20480, retentionYears: 99 },
    { code: 'mutation_porcha', family: 'legal', label: 'Mutation / Porcha record', labelBn: 'পর্চা', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 20480, retentionYears: 99 },
    { code: 'land_tax_khajna', family: 'legal', label: 'Land-tax receipt / Khajna', labelBn: 'খাজনা', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 10240, retentionYears: 12 },
    { code: 'rajuk_approval', family: 'legal', label: 'RAJUK approval', labelBn: 'রাজউক অনুমোদন', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 20480, retentionYears: 99 },
    { code: 'building_plan', family: 'legal', label: 'Approved building plan', labelBn: 'অনুমোদিত নকশা', defaultClassification: 'internalOnly', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf', 'dwg', 'png'], maxSizeKb: 40960, retentionYears: 99 },
    { code: 'noc', family: 'legal', label: 'NOC (No Objection Certificate)', labelBn: 'অনাপত্তি পত্র', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 10240, retentionYears: 30 },
    { code: 'agreement', family: 'legal', label: 'Agreement', labelBn: 'চুক্তিপত্র', defaultClassification: 'legalFinanceRestricted', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 10240, retentionYears: 30 },
    { code: 'legal_summary', family: 'legal', label: 'Legal status summary (partner-shareable)', labelBn: 'আইনি সারসংক্ষেপ', defaultClassification: 'partnerVisible', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 5120, retentionYears: 10 },
    { code: 'legal_other', family: 'legal', label: 'Other client-approved legal record', labelBn: 'অন্যান্য আইনি নথি', defaultClassification: 'internalOnly', uploaderRoles: ['Legal / Document Controller', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 20480, retentionYears: 15 },
    // -- Customer documents — uploaded by Sales / Operations (Manager) ---------
    { code: 'nid_passport', family: 'customer', label: 'NID / Passport copy', labelBn: 'এনআইডি / পাসপোর্ট', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 8192, retentionYears: 10 },
    { code: 'photograph', family: 'customer', label: 'Photograph', labelBn: 'ছবি', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Super Admin'], allowedExt: ['jpg', 'jpeg', 'png'], maxSizeKb: 5120, retentionYears: 10 },
    { code: 'nominee', family: 'customer', label: 'Nominee information', labelBn: 'নমিনি তথ্য', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 5120, retentionYears: 10 },
    { code: 'booking_form', family: 'customer', label: 'Booking form', labelBn: 'বুকিং ফর্ম', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 8192, retentionYears: 10 },
    { code: 'payment_proof', family: 'customer', label: 'Payment proof', labelBn: 'পেমেন্ট প্রমাণ', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Finance Officer', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeKb: 8192, retentionYears: 7 },
    { code: 'receipt', family: 'customer', label: 'Receipt', labelBn: 'রসিদ', defaultClassification: 'customerLeadRestricted', uploaderRoles: ['Manager', 'Finance Officer', 'Super Admin'], allowedExt: ['pdf'], maxSizeKb: 4096, retentionYears: 7 },
    { code: 'correspondence', family: 'customer', label: 'Supporting correspondence', labelBn: 'সংশ্লিষ্ট চিঠিপত্র', defaultClassification: 'internalOnly', uploaderRoles: ['Manager', 'Super Admin'], allowedExt: ['pdf', 'jpg', 'jpeg', 'png', 'eml'], maxSizeKb: 10240, retentionYears: 5 }
  ];
}

function findDocType(code, store) { return (((store || db).docTypeRegistry) || []).find(function (t) { return t.code === code; }); }
function extMime(ext) {
  return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', tiff: 'image/tiff', dwg: 'application/acad', eml: 'message/rfc822' }[ext] || 'application/octet-stream';
}
function computeRetention(doc, store) {
  var dt = findDocType(doc.docType, store);
  var years = dt ? dt.retentionYears : 10;
  var base = new Date(doc.uploadedAt || Date.now());
  var d = new Date(base.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}
// Best-effort type inference for legacy docs that predate the registry.
function guessDocType(d) {
  var n = (d.name || '').toLowerCase();
  if (/deed|dolil|দলিল/.test(n)) return 'title_deed';
  if (/porcha|mutation|পর্চা/.test(n)) return 'mutation_porcha';
  if (/khajna|land.?tax|খাজনা/.test(n)) return 'land_tax_khajna';
  if (/rajuk|রাজউক/.test(n)) return 'rajuk_approval';
  if (/noc/.test(n)) return 'noc';
  if (/plan|নকশা/.test(n)) return 'building_plan';
  if (/nid|passport|পাসপোর্ট/.test(n)) return 'nid_passport';
  if (/receipt|রসিদ/.test(n)) return 'receipt';
  if (/booking.?form/.test(n)) return 'booking_form';
  if (/price|list|handbook|brochure|summary/.test(n)) return 'legal_summary';
  return d.visibility === 'partner' ? 'legal_summary' : d.family === 'customer' ? 'correspondence' : 'legal_other';
}

// Idempotent backfill — upgrades the thin prototype document shape to the full
// compliance model on every load/reset, so stale data.json keeps working.
function normalizeDocs(store) {
  store.docTypeRegistry = (store.docTypeRegistry && store.docTypeRegistry.length) ? store.docTypeRegistry : defaultDocRegistry();
  store.config = store.config || {};
  if (store.config.signedUrlTtlSec == null) store.config.signedUrlTtlSec = 300;      // 5 min
  if (store.config.signedUrlTtlFastSec == null) store.config.signedUrlTtlFastSec = 45; // demo-fast
  store.signedTokens = store.signedTokens || {};
  store.seq = store.seq || {};
  if (store.seq.signed == null) store.seq.signed = 0;
  if (store.seq.access == null) store.seq.access = (store.accessLog || []).length;
  if (store.seq.repo == null) store.seq.repo = (store.documents || []).length;
  store.accessLog = store.accessLog || [];
  (store.documents || []).forEach(function (d) {
    if (!d.classification) d.classification = d.visibility === 'partner' ? 'partnerVisible' : d.visibility === 'client' ? 'customerLeadRestricted' : 'internalOnly';
    if (DOC_CLASSIFICATIONS.indexOf(d.classification) < 0) d.classification = 'internalOnly'; // default-deny
    if (d.docType == null) d.docType = guessDocType(d);
    var dt = findDocType(d.docType, store);
    if (d.family == null) d.family = dt ? dt.family : 'legal';
    if (d.scanStatus == null) d.scanStatus = 'clean';           // legacy docs pre-date scanning → treat as cleared
    if (DOC_SCAN_STATES.indexOf(d.scanStatus) < 0) d.scanStatus = 'clean';
    if (d.lifecycleStatus == null) d.lifecycleStatus = 'active';
    if (d.verificationStatus == null) d.verificationStatus = 'uploaded';
    if (d.version == null) d.version = 1;
    if (d.isCurrent == null) d.isCurrent = true;
    if (d.supersedesId === undefined) d.supersedesId = null;
    if (d.supersededById === undefined) d.supersededById = null;
    if (d.publishedToPartner == null) d.publishedToPartner = d.classification === 'partnerVisible';
    if (d.publishedPartnerIds === undefined) d.publishedPartnerIds = null; // null = all partners
    if (d.sharedToAllClients == null) d.sharedToAllClients = false;
    if (d.documentableType === undefined) {
      if (d.projectId) { d.documentableType = 'project'; d.documentableId = d.projectId; d.documentableLabel = d.projectName; }
      else { d.documentableType = null; d.documentableId = null; d.documentableLabel = null; }
    }
    if (d.customerId === undefined) d.customerId = d.documentableType === 'customer' ? d.documentableId : null;
    if (d.leadId === undefined) d.leadId = d.documentableType === 'lead' ? d.documentableId : null;
    if (d.storageKey == null) d.storageKey = 's3://salmon-secure-docs/' + d.id + '/' + encodeURIComponent(d.name || 'file');
    if (d.mime == null) d.mime = extMime((d.name || '').split('.').pop().toLowerCase());
    if (d.uploadedByRole === undefined) d.uploadedByRole = null;
    if (d.verifiedBy === undefined) { d.verifiedBy = null; d.verifiedByRole = null; d.verifiedAt = null; }
    if (d.deletedBy === undefined) { d.deletedBy = null; d.deletedAt = null; d.deleteReason = null; }
    if (d.archivedAt === undefined) d.archivedAt = null;
    if (d.retentionUntil === undefined || d.retentionUntil == null) d.retentionUntil = computeRetention(d, store);
    if (!Array.isArray(d.history) || !d.history.length) d.history = [{ action: 'uploaded', by: d.uploadedBy || 'Seed', role: d.uploadedByRole || 'Legal / Document Controller', at: d.uploadedAt || new Date().toISOString(), note: 'Uploaded' }];
  });
  // Legacy accessLog entries get an action so the compliance view is uniform.
  store.accessLog.forEach(function (a) { if (a.action == null) a.action = 'view'; });
}
normalizeDocs(db);

// ===========================================================================
// Req 6.16 — Support & Help Desk. Two distinct channels, never conflated:
//   • Partner support = a TICKET system (structured, categorised, threaded, SLA)
//   • Client support  = ONE approved real-time channel (in-app chat OR a WhatsApp
//     handoff with a ticket STUB — never a faked transcript).
// The standout is SLA aging: age + target make the queue read as a real help
// desk (Zendesk/Freshdesk), not a form inbox.
// ---------------------------------------------------------------------------
const TICKET_CATEGORIES = ['Customer Care', 'Sales', 'Accounts', 'Administration'];
const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'reopened'];
// SLA response target (hours to first response) per priority — configurable.
const SLA_HOURS = { urgent: 4, high: 8, normal: 24, low: 48 };
// Which staff role owns each category by default (auto-routing on creation).
const CATEGORY_ROUTING = {
  'Customer Care': 'Manager', 'Sales': 'Manager', 'Accounts': 'Finance Officer', 'Administration': 'Super Admin'
};

function slaForTicket(t) { return t.slaHours || SLA_HOURS[t.priority] || SLA_HOURS.normal; }

// Idempotent backfill — upgrades the thin {dept, body, replies[]} ticket to the
// full help-desk model (source, category, priority, assignee, status, threaded
// conversation, SLA, attachments) on every load/reset.
function normalizeTickets(store) {
  store.config = store.config || {};
  // Client real-time channel seam (6.16 clause 3) — ONE approved channel.
  if (store.config.clientSupportChannel == null) store.config.clientSupportChannel = 'in_app'; // 'in_app' | 'whatsapp'
  if (store.config.whatsappNumber == null) store.config.whatsappNumber = '+8801700000000';
  store.seq = store.seq || {};
  if (store.seq.ticketMsg == null) store.seq.ticketMsg = 0;
  (store.tickets || []).forEach(function (t) {
    if (t.source == null) t.source = t.clientId ? 'client' : 'partner';
    if (t.requesterId == null) t.requesterId = t.partnerId || t.clientId || null;
    if (t.requesterName == null) t.requesterName = t.partnerName || t.clientName || 'Requester';
    // dept → category (legacy 'Technical' folds into Customer Care)
    if (t.category == null) t.category = TICKET_CATEGORIES.indexOf(t.dept) >= 0 ? t.dept : (t.dept === 'Technical' ? 'Customer Care' : 'Customer Care');
    if (t.priority == null || TICKET_PRIORITIES.indexOf(t.priority) < 0) t.priority = 'normal';
    // legacy status open/closed → open/resolved
    if (t.status === 'closed') t.status = 'resolved';
    if (TICKET_STATUSES.indexOf(t.status) < 0) t.status = 'open';
    if (t.assigneeId === undefined) t.assigneeId = null;
    if (t.assigneeName === undefined) t.assigneeName = null;
    if (t.createdAt == null) t.createdAt = new Date().toISOString();
    if (t.updatedAt == null) t.updatedAt = t.createdAt;
    if (t.firstResponseAt === undefined) t.firstResponseAt = null;
    if (t.resolvedAt === undefined) t.resolvedAt = t.status === 'resolved' ? t.updatedAt : null;
    if (t.slaHours == null) t.slaHours = SLA_HOURS[t.priority] || SLA_HOURS.normal;
    if (!Array.isArray(t.attachments)) t.attachments = [];
    if (!Array.isArray(t.history)) t.history = [];
    if (t.channel == null) t.channel = t.source === 'client' ? (store.config.clientSupportChannel) : 'ticket';
    // Build the threaded conversation from the legacy {body, replies[]} shape.
    if (!Array.isArray(t.thread)) {
      t.thread = [];
      if (t.body) t.thread.push({ by: t.requesterName, side: 'requester', at: t.createdAt, text: t.body, kind: 'message' });
      (t.replies || []).forEach(function (r) {
        t.thread.push({ by: r.by, side: 'staff', at: r.at, text: r.text, kind: 'message' });
        if (t.firstResponseAt == null) t.firstResponseAt = r.at;
      });
    }
  });
}
normalizeTickets(db);

// SLA state for a ticket — drives the subtle aging warning in the queue.
// Returns { ageMs, targetMs, pct, state } where state ∈ ok|approaching|breached.
// Resolved tickets never "age".
function ticketSla(t) {
  var open = t.status !== 'resolved';
  var targetMs = slaForTicket(t) * 3600 * 1000;
  var endTs = open ? Date.now() : new Date(t.resolvedAt || t.updatedAt).getTime();
  var ageMs = Math.max(0, endTs - new Date(t.createdAt).getTime());
  var pct = targetMs ? ageMs / targetMs : 0;
  var state = !open ? 'resolved' : pct >= 1 ? 'breached' : pct >= 0.75 ? 'approaching' : 'ok';
  return { ageMs: ageMs, targetMs: targetMs, pct: pct, state: state, open: open };
}

// --- Access model (6.7.4, 6.7.10) — classification × role × relationship. ---
// Server-side, default-deny. A customer passing the role gate STILL only sees
// their OWN documents; a partner sees only explicitly-published summaries.
function canAccessDocument(actor, doc) {
  if (!doc) return { ok: false, reason: 'document not found' };
  // Safety gate (6.7.7) — a file that is not `clean` is unreachable to everyone.
  if (doc.scanStatus !== 'clean') return { ok: false, reason: 'file is ' + doc.scanStatus + ' — not cleared by malware scan' };
  // Soft-deleted docs are not servable (their audit trail is retained, 6.7.9).
  if (doc.lifecycleStatus === 'deleted') return { ok: false, reason: 'document has been deleted' };
  var cls = DOC_CLASSIFICATIONS.indexOf(doc.classification) >= 0 ? doc.classification : 'internalOnly'; // default-deny
  if (!actor || !actor.kind) return { ok: false, reason: 'no actor' };

  if (actor.kind === 'staff') {
    var role = actor.role;
    if (role === 'Super Admin') return { ok: true };                                   // sees all
    if (cls === 'internalOnly') return { ok: true };                                   // any Salmon staff
    if (cls === 'partnerVisible') return { ok: true };                                 // staff see what partners see
    if (cls === 'legalFinanceRestricted') return (role === 'Legal / Document Controller' || role === 'Finance Officer') ? { ok: true } : { ok: false, reason: role + ' is not Legal or Finance' };
    if (cls === 'customerLeadRestricted') return (role === 'Legal / Document Controller' || role === 'Finance Officer' || role === 'Manager') ? { ok: true } : { ok: false, reason: role + ' is not authorised for customer documents' };
    return { ok: false, reason: 'unclassified — default deny' };
  }
  if (actor.kind === 'partner') {
    if (cls !== 'partnerVisible') return { ok: false, reason: 'not partner-visible (sensitive documents are restricted by default)' };
    if (!doc.publishedToPartner) return { ok: false, reason: 'classified partner-visible but not yet published' };
    if (Array.isArray(doc.publishedPartnerIds) && doc.publishedPartnerIds.length && doc.publishedPartnerIds.indexOf(actor.id) < 0) return { ok: false, reason: 'not published to this partner' };
    return { ok: true };
  }
  if (actor.kind === 'client') {
    if (cls !== 'customerLeadRestricted') return { ok: false, reason: 'not a customer document' };
    if (doc.sharedToAllClients) return { ok: true };                                   // general collateral explicitly published to every client (e.g. buyer handbook)
    var mine = (doc.customerId && doc.customerId === actor.id) ||
      (doc.leadId && actor.leadId && doc.leadId === actor.leadId) ||
      (doc.documentableType === 'customer' && doc.documentableId === actor.id) ||
      (doc.documentableType === 'booking' && Array.isArray(actor.bookingIds) && actor.bookingIds.indexOf(doc.documentableId) >= 0);
    return mine ? { ok: true } : { ok: false, reason: 'this document concerns another customer' };
  }
  return { ok: false, reason: 'unknown actor kind' };
}

// Resolve WHO is acting from the request. Each surface sends its own identity.
function resolveDocActor(body) {
  body = body || {};
  if (body.as === 'partner' || (body.partnerId && body.as !== 'staff')) {
    var p = findPartner(body.partnerId || db.session.partnerId);
    return p ? { kind: 'partner', id: p.id, role: 'Partner', label: p.name } : null;
  }
  if (body.as === 'client' || (body.clientId && body.as !== 'staff')) {
    var c = findClient(body.clientId || db.session.clientId);
    if (!c) return null;
    return { kind: 'client', id: c.id, role: 'Client', label: c.name, leadId: c.leadId || null, bookingIds: db.bookings.filter(function (b) { return b.clientId === c.id; }).map(function (b) { return b.id; }) };
  }
  var s = db.staff.find(function (x) { return x.id === db.session.staffId; });
  return s ? { kind: 'staff', id: s.id, role: s.role, label: s.name } : null;
}
function feedSideFor(actor) { return actor.kind === 'partner' ? 'partner' : actor.kind === 'client' ? 'client' : 'admin'; }

function resolveLinkage(b) {
  var type = b.documentableType || null, id = b.documentableId || null, label = null;
  if (!type && b.projectId) { type = 'project'; id = b.projectId; }
  if (type === 'project') { var p = findProject(id); label = p ? p.name : (b.projectName || id); }
  else if (type === 'customer') { var c = findClient(id); label = c ? c.name : id; }
  else if (type === 'lead') { var l = findLead(id); label = l ? l.prospectName : id; }
  else if (type === 'booking') { var bk = findBooking(id); label = bk ? (bk.projectName + ' · ' + bk.unitNo) : id; }
  else if (type === 'inventory') { label = 'Unit ' + id; }
  else if (type === 'investment') { label = 'Investment ' + id; }
  else if (type === 'payment') { label = 'Payment ' + id; }
  return { type: type, id: id, label: label };
}

// --- Private storage + time-limited signed links (6.7.5, 6.7.6). -----------
// Files live behind a private bucket model (storageKey). There is NO permanent
// public URL: the ONLY way to reach a file's bytes is a short-lived signed
// token issued after canAccessDocument passes and re-checked on delivery.
function issueSignedUrl(doc, actor, purpose) {
  // prune expired tokens so the map does not grow unbounded
  var now = Date.now();
  Object.keys(db.signedTokens).forEach(function (k) { if (db.signedTokens[k].expiresAt < now - 60000) delete db.signedTokens[k]; });
  db.seq.signed = (db.seq.signed || 0) + 1;
  var token = crypto.randomBytes(24).toString('hex');
  var ttl = (db.config.speed === 'fast' ? db.config.signedUrlTtlFastSec : db.config.signedUrlTtlSec) || 300;
  db.signedTokens[token] = {
    id: 'SIG-' + db.seq.signed, docId: doc.id, purpose: purpose || 'view',
    actorKind: actor.kind, actorId: actor.id || null, actorRole: actor.role || null, actorLabel: actor.label,
    actorLeadId: actor.leadId || null, actorBookingIds: actor.bookingIds || null,
    issuedAt: now, expiresAt: now + ttl * 1000, usedAt: null
  };
  return { token: token, url: '/api/documents/file/' + token, expiresAt: now + ttl * 1000, ttlSec: ttl };
}
function tokenActor(t) {
  return { kind: t.actorKind, id: t.actorId, role: t.actorRole, label: t.actorLabel, leadId: t.actorLeadId, bookingIds: t.actorBookingIds };
}

// --- Malware-scan safety pipeline (6.7.7). ---------------------------------
// Mock scanner: a file whose name trips a signature is quarantined and stays
// unreachable. In production this is an async call to a real scanning service;
// the ARCHITECTURE (states + gates) is what enforces safety, not the mock.
function scanDocument(docId) {
  var delay = db.config.speed === 'fast' ? 1200 : 3000;
  setTimeout(function () {
    var doc = db.documents.find(function (d) { return d.id === docId; });
    if (!doc || doc.scanStatus !== 'scanning') return;
    var flagged = /eicar|malware|virus|infected|trojan/i.test(doc.name || '');
    doc.scanStatus = flagged ? 'quarantined' : 'clean';
    var at = new Date().toISOString();
    doc.history.push(flagged
      ? { action: 'quarantined', by: 'Malware scanner', role: 'System', at: at, note: 'Threat signature matched — file quarantined, never made accessible' }
      : { action: 'scan_clean', by: 'Malware scanner', role: 'System', at: at, note: 'No threats found — file cleared for access' });
    if (flagged) pushNote('admin', { kind: 'doc.quarantined', title: 'File quarantined', body: doc.name + ' — blocked by malware scan', refId: doc.id });
    save();
    emit(flagged ? 'doc.quarantined' : 'doc.clean', { document: doc }, [
      feedEntry('←', 'server', 'admin', '', 'event: ' + (flagged ? 'doc.quarantined' : 'doc.clean'),
        flagged ? doc.name + ' QUARANTINED — unreachable by anyone' : doc.name + ' passed scan — now accessible', 'evt', doc.id)
    ]);
  }, delay);
}

// --- Audit log (6.7.6) — every upload/view/download/update/delete recorded. -
function logAccess(doc, actor, actorType, action) {
  db.seq.access = (db.seq.access || 0) + 1;
  db.accessLog = db.accessLog || [];
  db.accessLog.unshift({
    id: 'AL-' + db.seq.access, docId: doc.id, docName: doc.name,
    classification: doc.classification, action: action || 'view',
    actor: actor, actorType: actorType, at: new Date().toISOString()
  });
  if (db.accessLog.length > 200) db.accessLog.length = 200;
}

// A minimal HTML rendering that stands in for the decrypted file bytes. In
// production this streams the object from the private bucket; here it proves
// the file is reachable ONLY through the gated, expiring, audited signed link.
function mockDocFilePage(doc, t) {
  var expiresIn = Math.max(0, Math.round((t.expiresAt - Date.now()) / 1000));
  return '<!doctype html><meta charset="utf-8"><title>' + esc(doc.name) + '</title>' +
    '<body style="margin:0;font-family:ui-sans-serif,system-ui;background:#f4f1ea;color:#1a1a1a">' +
    '<div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #ddd;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">' +
    '<div style="background:#7a1e2b;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">' +
    '<b>Salmon — Secure Document</b><span style="font-size:12px;opacity:.85">Viewing logged · link expires in ' + expiresIn + 's</span></div>' +
    '<div style="padding:28px 24px">' +
    '<div style="font-size:20px;font-weight:800">' + esc(doc.name) + '</div>' +
    '<div style="color:#666;margin-top:4px">' + esc(CLASSIFICATION_LABEL[doc.classification] || doc.classification) + ' · v' + doc.version + ' · ' + esc(doc.storageKey) + '</div>' +
    '<div style="margin-top:20px;height:220px;border:2px dashed #ccc;border-radius:8px;display:grid;place-items:center;color:#999;text-align:center;padding:16px">' +
    'Mock document body.<br>In production this is the decrypted object streamed from the private encrypted bucket.<br>No permanent public URL exists — you reached this only via a signed, expiring, permission-checked link.</div>' +
    '<div style="margin-top:16px;font-size:12px;color:#888">Served to <b>' + esc(t.actorLabel) + '</b> (' + esc(t.actorKind) + ') · purpose: ' + esc(t.purpose) + ' · this delivery was written to the access log.</div>' +
    '</div></div></body>';
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// ---------------------------------------------------------------------------
// SSE — the live wire. Every browser that opens keeps one connection here.
// ---------------------------------------------------------------------------
const sseClients = new Set();

function sseSend(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

let feedSeq = 0;
function feedEntry(dir, source, target, method, pathStr, text, tone, ref) {
  feedSeq += 1;
  return {
    id: 'FD-' + feedSeq,
    ts: Date.now(),
    dir, // '→' request from a side  |  '←' event delivered to a side
    source, // 'client' | 'admin' | 'server'
    target, // 'client' | 'admin'
    method: method || '',
    path: pathStr || '',
    text,
    tone, // 'req' | 'evt'
    ref: ref || ''
  };
}

/**
 * Broadcast a mutation to every connected browser.
 * `feed` is the pair of arrows (request + delivery) shown in the live event feed.
 */
function emit(type, data, feed) {
  db.seq.event += 1;
  const evt = { id: 'EV-' + db.seq.event, type, ts: Date.now(), data: data || {} };
  db.events.unshift(evt);
  if (db.events.length > 200) db.events.length = 200;
  const feedArrows = feed || [];
  // role attribution — stamp admin-initiated request arrows with "Name (Role)"
  const actor = db.staff.find((s) => s.id === db.session.staffId);
  if (actor) {
    feedArrows.forEach((f) => {
      if (f.source === 'admin' && f.dir === '→' && f.text.indexOf(actor.name) < 0) {
        f.actor = actor.name + ' · ' + actor.role;
        f.text = actor.name + ' (' + roleShort(actor.role) + '): ' + f.text;
      }
    });
  }
  db.feed = (db.feed || []);
  feedArrows.forEach((f) => db.feed.unshift(f));
  if (db.feed.length > 200) db.feed.length = 200;
  save();
  const payload = { type, ts: evt.ts, data: evt.data, feed: feedArrows };
  sseClients.forEach((res) => sseSend(res, payload));
  const arrow = feedArrows.map((f) => `${f.dir} ${f.text}`).join('  |  ');
  console.log(`  ↳ SSE  ${type}  →  ${sseClients.size} client(s)${arrow ? '   [' + arrow + ']' : ''}`);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '60mb' })); // headroom for upload-from-device data URLs (images/PDF)

// CORS — open to localhost for the demo.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Request log — so the presenter can show a live terminal if asked "is it real?"
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/events') {
    const t = new Date().toLocaleTimeString('en-GB');
    console.log(`${t}  ${req.method.padEnd(4)} ${req.path}`);
  }
  next();
});

// ---- helpers --------------------------------------------------------------
function findClient(id) { return db.clients.find((c) => c.id === id); }
function findProject(id) { return db.projects.find((p) => p.id === id); }
function findBooking(id) { return db.bookings.find((b) => b.id === id); }
function findUnit(project, unitNo) { return project ? project.units.find((u) => u.unitNo === unitNo) : null; }
function bdt(n) { return '৳' + Number(n).toLocaleString('en-IN'); }
function activeLockWindowSec() {
  return db.config.speed === 'fast' ? db.config.lockWindowFastSec : db.config.lockWindowSec;
}
function roleShort(role) {
  return { 'Super Admin': 'Super Admin', 'Manager': 'Manager', 'Finance Officer': 'Finance', 'Legal / Document Controller': 'Legal' }[role] || role;
}

// ---- permissions: which staff roles may perform which admin action --------
const PERM = {
  'kyc.verify': ['Super Admin', 'Legal / Document Controller'],
  'kyc.reject': ['Super Admin', 'Legal / Document Controller'],
  'doc.manage': ['Super Admin', 'Legal / Document Controller'],
  'booking.confirm': ['Super Admin', 'Finance Officer'],
  'installment.verify': ['Super Admin', 'Finance Officer'],
  'wire.verify': ['Super Admin', 'Finance Officer'],
  'commission.approve': ['Super Admin', 'Finance Officer'],
  'commission.create': ['Super Admin', 'Finance Officer'],
  'commission.correct': ['Super Admin', 'Finance Officer'],
  'settlement.approve': ['Super Admin', 'Finance Officer'],
  'settlement.settle': ['Super Admin', 'Finance Officer'],
  'invoice.generate': ['Super Admin', 'Finance Officer'],
  'investment.confirm': ['Super Admin', 'Manager', 'Finance Officer'],
  'partner.approve': ['Super Admin', 'Manager'],
  'partner.reject': ['Super Admin', 'Manager'],
  'program.participation': ['Super Admin', 'Manager'], // suspend / close / activate-zero (6.3.3)
  'program.activate.with': ['Super Admin'],            // the 6.1 eligibility approval — admin-only
  'lead.manage': ['Super Admin', 'Manager'],
  'lead.convert': ['Super Admin', 'Manager'],
  'meeting.confirm': ['Super Admin', 'Manager'],
  'consultation.confirm': ['Super Admin', 'Manager'],
  'ticket.reply': ['Super Admin', 'Manager', 'Finance Officer'],
  'construction.publish': ['Super Admin', 'Manager'],
  'project.manage': ['Super Admin', 'Manager'],
  'task.create': ['Super Admin', 'Manager'],
  'task.cancel': ['Super Admin', 'Manager'],
  'target.set': ['Super Admin', 'Manager']
};
function requirePermission(action, res) {
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const allowed = PERM[action] || [];
  if (!staff || allowed.indexOf(staff.role) < 0) {
    res.status(403).json({ error: 'forbidden — ' + (staff ? staff.role : 'unknown role') + ' cannot perform ' + action });
    return false;
  }
  return true;
}

function pushNote(side, note) {
  note.id = 'N-' + side + '-' + Date.now() + '-' + Math.floor(feedSeq);
  note.ts = Date.now();
  note.read = false;
  db.notifications[side].unshift(note);
  if (db.notifications[side].length > 50) db.notifications[side].length = 50;
}

// Member-safe settlement projection — STATUS + amount + dates only. Finance
// reference, evidence, channel and hold/reject reasons NEVER cross to the member.
function settlementView(s) {
  return {
    id: s.id, partnerId: s.partnerId, partnerName: s.partnerName, amountBdt: s.amountBdt,
    status: s.status, requestedAt: s.requestedAt, approvedAt: s.approvedAt || null,
    settledAt: s.settledAt || null, paymentDate: s.paymentDate || null
  };
}

// ---- state ----------------------------------------------------------------
app.get('/api/state', (req, res) => {
  // 6.4.4/6.4.5 — the wall enforced at the source: a partner-scoped caller only
  // ever receives its own leads, each passed through partnerView(). Internal
  // notes, owner, rep and next-action never cross the wire.
  if (req.query.as === 'partner') {
    const pid = db.session.partnerId;
    const safe = Object.assign({}, db, {
      leads: (db.leads || []).filter((l) => l.partnerId === pid).map(partnerView),
      // members see settlement STATUS only — finance reference/evidence/reason stay server-side
      settlements: (db.settlements || []).filter((s) => s.partnerId === pid).map(settlementView)
    });
    return res.json(safe);
  }
  res.json(db);
});
app.get('/api/config', (req, res) => {
  res.json({ ...db.config, lockWindowActiveSec: activeLockWindowSec() });
});

app.post('/api/reset', (req, res) => {
  db = loadSeed();
  db.feed = [];
  normalizeDb(db);
  normalizeLeads(db);
  normalizeDocs(db);
  normalizeTickets(db);
  save();
  emit('demo.reset', {}, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/reset', 'Presenter reset the demo', 'req'),
    feedEntry('←', 'server', 'client', '', '', 'state restored to seed', 'evt')
  ]);
  res.json({ ok: true });
});

app.post('/api/config/speed', (req, res) => {
  const speed = req.body.speed === 'fast' ? 'fast' : 'normal';
  db.config.speed = speed;
  emit('config.speed', { speed }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/config/speed', `Speed set to ${speed}`, 'req'),
    feedEntry('←', 'server', 'admin', '', '', `lock window now ${activeLockWindowSec()}s`, 'evt')
  ]);
  res.json({ speed, lockWindowActiveSec: activeLockWindowSec() });
});

// 6.16.3 — switch the client's approved real-time channel (in-app ↔ WhatsApp).
// Existing client tickets adopt the new channel; the seam is one config value.
app.post('/api/config/channel', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const channel = req.body.channel === 'whatsapp' ? 'whatsapp' : 'in_app';
  db.config.clientSupportChannel = channel;
  if (req.body.whatsappNumber) db.config.whatsappNumber = req.body.whatsappNumber;
  (db.tickets || []).forEach((t) => { if (t.source === 'client' && t.status !== 'resolved') t.channel = channel; });
  emit('config.channel', { channel: channel }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/config/channel', `Client channel → ${channel === 'whatsapp' ? 'WhatsApp Business' : 'in-app chat'}`, 'req'),
    feedEntry('←', 'server', 'client', '', 'event: config.channel', 'client support surface switches', 'evt')
  ]);
  res.json({ channel: channel, whatsappNumber: db.config.whatsappNumber });
});

app.post('/api/session/staff', (req, res) => {
  const staff = db.staff.find((s) => s.id === req.body.staffId);
  if (!staff) return res.status(404).json({ error: 'staff not found' });
  db.session.staffId = staff.id;
  emit('session.staff', { staff }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/session/staff', `Signed in as ${staff.role}`, 'req'),
    feedEntry('←', 'server', 'admin', '', '', `${staff.name} active`, 'evt')
  ]);
  res.json({ staff });
});

// ---------------------------------------------------------------------------
// FLOW 1 — registration + KYC
// ---------------------------------------------------------------------------
app.post('/api/clients', (req, res) => {
  const { name, email, phone, country } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const client = {
    id: 'CL-' + (1001 + db.clients.length),
    name, email,
    phone: phone || '',
    country: country || '',
    password: 'demo',
    createdAt: new Date().toISOString(),
    kycStatus: 'not_submitted',
    kycFile: null,
    bookings: [],
    schedule: [],
    ledger: [],
    scheduleProjectName: null,
    scheduleUnitNo: null,
    isNew: true
  };
  db.clients.push(client);
  db.session.clientId = client.id;
  pushNote('admin', { kind: 'client.created', title: 'New client registered', body: `${name} · ${country || 'Unknown'}`, refId: client.id });
  emit('client.created', { client }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/clients', `${name} registered`, 'req', client.id),
    feedEntry('←', 'server', 'admin', '', 'event: client.created', `delivered to admin — ${name} from ${country || '—'}`, 'evt', client.id)
  ]);
  res.status(201).json({ client });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const client = db.clients.find((c) => c.email.toLowerCase() === String(email || '').toLowerCase());
  if (!client || (password && client.password !== password)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  db.session.clientId = client.id;
  emit('client.login', { client }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/auth/login', `${client.name} signed in`, 'req', client.id)
  ]);
  res.json({ client });
});

app.post('/api/kyc/upload', (req, res) => {
  const client = findClient(req.body.clientId || db.session.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  client.kycFile = req.body.filename || 'passport.jpg';
  client.kycStatus = 'pending';
  pushNote('admin', { kind: 'kyc.pending', title: 'KYC awaiting review', body: `${client.name} uploaded ${client.kycFile}`, refId: client.id });
  emit('kyc.pending', { clientId: client.id, client }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/kyc/upload', `${client.name} uploaded passport`, 'req', client.id),
    feedEntry('←', 'server', 'admin', '', 'event: kyc.pending', 'delivered to admin KYC queue', 'evt', client.id)
  ]);
  res.json({ client });
});

app.post('/api/kyc/verify', (req, res) => {
  if (!requirePermission('kyc.verify', res)) return;
  const client = findClient(req.body.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  client.kycStatus = 'verified';
  client.kycReason = null;
  pushNote('client', { kind: 'kyc.verified', title: 'KYC verified', body: 'Your identity has been verified.', refId: client.id });
  emit('kyc.verified', { clientId: client.id, client }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/kyc/verify', `KYC verified for ${client.name}`, 'req', client.id),
    feedEntry('←', 'server', 'client', '', 'event: kyc.verified', "delivered to client's phone", 'evt', client.id)
  ]);
  res.json({ client });
});

// ---------------------------------------------------------------------------
// FLOW 2 — booking a unit
// ---------------------------------------------------------------------------
function nextBookingId() {
  db.seq.booking += 1;
  return 'BK-2024-' + String(db.seq.booking).padStart(5, '0');
}
function nextWebhookRef(prefix) {
  db.seq.webhook += 1;
  return prefix + '-' + db.seq.webhook;
}

app.post('/api/bookings', (req, res) => {
  const client = findClient(req.body.clientId || db.session.clientId);
  const project = findProject(req.body.projectId);
  if (!client || !project) return res.status(404).json({ error: 'client or project not found' });
  const unit = findUnit(project, req.body.unitNo);
  if (!unit) return res.status(404).json({ error: 'unit not found' });
  if (unit.status !== 'available') return res.status(409).json({ error: 'unit not available' });

  const windowSec = activeLockWindowSec();
  const now = Date.now();
  const booking = {
    id: nextBookingId(),
    clientId: client.id,
    clientName: client.name,
    projectId: project.id,
    projectName: project.name,
    unitNo: unit.unitNo,
    unitAreaSqft: unit.areaSqft,
    unitPriceBdt: unit.priceBdt,
    amountBdt: db.config.tokenAmountBdt,
    status: 'pending_payment', // pending_payment -> awaiting_confirmation -> confirmed | expired
    reference: null,
    lockStartedAt: now,
    lockExpiresAt: now + windowSec * 1000,
    lockWindowSec: windowSec,
    createdAt: new Date(now).toISOString()
  };
  unit.status = 'locked';
  db.bookings.push(booking);
  emit('booking.locked', { booking, projectId: project.id }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/bookings', `${client.name} started booking ${unit.unitNo}`, 'req', booking.id),
    feedEntry('←', 'server', 'admin', '', 'event: unit.locked', `${unit.unitNo} locked for ${windowSec}s`, 'evt', booking.id)
  ]);
  res.status(201).json({ booking });
});

// Hosted-checkout stub confirms → a webhook lands in the admin reconciliation queue.
app.post('/api/payments/checkout', (req, res) => {
  const booking = findBooking(req.body.bookingId);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  if (booking.status === 'expired') return res.status(409).json({ error: 'lock expired' });
  const client = findClient(booking.clientId);
  const ref = nextWebhookRef('PAY-BEL');
  booking.reference = ref;
  booking.status = 'awaiting_confirmation';
  const gateway = pickGateway(client.country);
  const webhook = {
    id: 'WH-' + db.seq.webhook,
    kind: 'booking',
    reference: ref,
    bookingId: booking.id,
    clientId: client.id,
    clientName: client.name,
    projectName: booking.projectName,
    unitNo: booking.unitNo,
    amountBdt: booking.amountBdt,
    gateway,
    signatureVerified: true,
    status: 'pending', // pending -> matched
    createdAt: new Date().toISOString()
  };
  db.webhooks.unshift(webhook);
  pushNote('admin', { kind: 'webhook.received', title: 'Payment webhook received', body: `${bdt(webhook.amountBdt)} · ${ref} · ${gateway}`, refId: webhook.id });
  emit('webhook.received', { webhook, bookingId: booking.id }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/payments/checkout', `${client.name} confirmed payment ${bdt(webhook.amountBdt)}`, 'req', booking.id),
    feedEntry('←', 'server', 'admin', '', 'event: webhook.received', `signature verified · ${ref}`, 'evt', webhook.id)
  ]);
  res.json({ booking, webhook });
});

function pickGateway(country) {
  const c = String(country || '').toLowerCase();
  if (c.includes('bangladesh')) return 'SSLCommerz';
  if (c.includes('uae') || c.includes('emirates')) return 'Stripe';
  return 'Bank Wire';
}

// Admin confirms the webhook → booking confirms, unit books, installment schedule generates.
app.post('/api/bookings/confirm', (req, res) => {
  if (!requirePermission('booking.confirm', res)) return;
  const booking = findBooking(req.body.bookingId);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  if (booking.status === 'expired') return res.status(409).json({ error: 'lock expired — cannot confirm' });
  const client = findClient(booking.clientId);
  const project = findProject(booking.projectId);
  const unit = findUnit(project, booking.unitNo);

  booking.status = 'confirmed';
  booking.confirmedAt = new Date().toISOString();
  if (unit) unit.status = 'booked';
  if (!client.bookings.includes(booking.id)) client.bookings.push(booking.id);

  const wh = db.webhooks.find((w) => w.bookingId === booking.id);
  if (wh) wh.status = 'matched';

  // token ledger entry
  db.seq.ledger += 1;
  client.ledger = client.ledger || [];
  client.ledger.unshift({
    id: 'LG-' + db.seq.ledger,
    ts: booking.confirmedAt,
    desc: `Booking token — ${booking.projectName} ${booking.unitNo}`,
    debitBdt: 0, creditBdt: booking.amountBdt,
    method: wh ? wh.gateway : 'Card', status: 'verified', ref: booking.reference
  });

  // generate installment schedule (only if this client has none yet)
  if (!client.schedule || client.schedule.length === 0) {
    client.schedule = buildSchedule(client.id);
    client.scheduleProjectName = booking.projectName;
    client.scheduleUnitNo = booking.unitNo;
  }

  pushNote('client', { kind: 'booking.confirmed', title: 'Booking confirmed', body: `${booking.unitNo} · ${booking.id}`, refId: booking.id });
  emit('booking.confirmed', { bookingId: booking.id, booking, clientId: client.id }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/bookings/confirm', `${booking.id} confirmed — ${client.name} notified`, 'req', booking.id),
    feedEntry('←', 'server', 'client', '', 'event: booking.confirmed', "client's pending screen resolves", 'evt', booking.id)
  ]);
  res.json({ booking });
});

function buildSchedule(clientId) {
  const out = [];
  const count = db.config.installmentCount;
  const amount = db.config.installmentAmountBdt;
  for (let i = 1; i <= count; i++) {
    db.seq.inst += 1;
    const due = new Date();
    due.setDate(due.getDate() + 5 + (i - 1) * 30);
    out.push({
      id: 'INST-' + db.seq.inst,
      n: i,
      label: `Installment ${i} of ${count}`,
      amountBdt: amount,
      dueDate: due.toISOString(),
      status: 'due', // due -> pending -> paid
      paidAt: null
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// FLOW 3 — installment payment
// ---------------------------------------------------------------------------
app.post('/api/installments/pay', (req, res) => {
  const client = findClient(req.body.clientId || db.session.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  const inst = (client.schedule || []).find((i) => i.id === req.body.installmentId);
  if (!inst) return res.status(404).json({ error: 'installment not found' });
  if (inst.status === 'paid') return res.status(409).json({ error: 'already paid' });

  inst.status = 'pending';
  const ref = nextWebhookRef('PAY-FLO');
  inst.pendingRef = ref;
  const gateway = pickGateway(client.country);

  const webhook = {
    id: 'WH-' + db.seq.webhook,
    kind: 'installment',
    reference: ref,
    installmentId: inst.id,
    clientId: client.id,
    clientName: client.name,
    projectName: client.scheduleProjectName || '—',
    unitNo: client.scheduleUnitNo || '—',
    amountBdt: inst.amountBdt,
    gateway,
    signatureVerified: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
    label: inst.label
  };
  db.webhooks.unshift(webhook);

  db.seq.ledger += 1;
  const ledgerId = 'LG-' + db.seq.ledger;
  inst.ledgerId = ledgerId;
  client.ledger = client.ledger || [];
  client.ledger.unshift({
    id: ledgerId,
    ts: webhook.createdAt,
    desc: inst.label,
    debitBdt: 0, creditBdt: inst.amountBdt,
    method: gateway, status: 'pending', ref
  });

  pushNote('admin', { kind: 'payment.pending', title: 'Installment payment pending', body: `${client.name} · ${inst.label} · ${bdt(inst.amountBdt)}`, refId: webhook.id });
  emit('payment.pending', { installmentId: inst.id, clientId: client.id, webhook }, [
    feedEntry('→', 'client', 'client', 'POST', '/api/installments/pay', `${client.name} paid ${inst.label}`, 'req', inst.id),
    feedEntry('←', 'server', 'admin', '', 'event: payment.pending', `pending verification · ${ref}`, 'evt', webhook.id)
  ]);
  res.json({ installment: inst, webhook });
});

app.post('/api/installments/verify', (req, res) => {
  if (!requirePermission('installment.verify', res)) return;
  const client = findClient(req.body.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  const inst = (client.schedule || []).find((i) => i.id === req.body.installmentId);
  if (!inst) return res.status(404).json({ error: 'installment not found' });

  inst.status = 'paid';
  inst.paidAt = new Date().toISOString();
  const led = (client.ledger || []).find((l) => l.id === inst.ledgerId);
  if (led) led.status = 'verified';
  const wh = db.webhooks.find((w) => w.installmentId === inst.id);
  if (wh) wh.status = 'matched';

  pushNote('client', { kind: 'installment.verified', title: 'Payment verified', body: `${inst.label} · ${bdt(inst.amountBdt)}`, refId: inst.id });
  emit('installment.verified', { installmentId: inst.id, clientId: client.id }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/installments/verify', `${inst.label} verified for ${client.name}`, 'req', inst.id),
    feedEntry('←', 'server', 'client', '', 'event: installment.verified', "client's ledger updates", 'evt', inst.id)
  ]);
  res.json({ installment: inst });
});

// mark a notification read (small nicety, no ripple)
app.post('/api/notifications/read', (req, res) => {
  const side = ['client', 'admin', 'partner'].indexOf(req.body.side) >= 0 ? req.body.side : 'admin';
  (db.notifications[side] || []).forEach((n) => { n.read = true; });
  save();
  res.json({ ok: true });
});

// ===========================================================================
// PARTNER SIDE  (Sales Partner ↔ Admin).  Additive — the client endpoints
// above are untouched. Same store, same SSE bus, same event feed.
// ===========================================================================
function findPartner(id) { return db.partners.find((p) => p.id === id); }
function findApplication(id) { return db.applications.find((a) => a.id === id); }
function findLead(id) { return db.leads.find((l) => l.id === id); }
function findCommission(id) { return db.commissions.find((c) => c.id === id); }

// 6.18 audit — every commission mutation is a new audited event, never a silent edit.
function pushAudit(record, action, detail) {
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const evt = { at: new Date().toISOString(), by: staff ? staff.name : 'System', role: staff ? staff.role : '', action: action, detail: detail || '' };
  record.events = record.events || [];
  record.events.unshift(evt);
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(Object.assign({ recordId: record.id }, evt));
  if (db.auditLog.length > 300) db.auditLog.length = 300;
  return evt;
}

// ---- Req 6.4: the wall — lead attribution + partner-facing projection ------
// The per-lead attestation wording (6.4.2). Distinct from the registration-time
// umbrella consent (6.1); this is captured per lead and stored with a timestamp.
const CONSENT_STATEMENT = 'The referred person permitted their name and phone number to be shared with Salmon so a representative may contact them about property.';
// Internal CRM status vocabulary → the SIX statuses a partner is ever shown.
// Everything else about a lead (notes, owner, next action) stays server-side.
const PARTNER_STATUS = {
  new: 'submitted', contacted: 'contacted',
  meeting_scheduled: 'meeting_scheduled', meeting_done: 'meeting_done',
  visit_scheduled: 'visit_scheduled', visit_done: 'visit_done',
  converted: 'converted', rejected: 'closed'
};
// 6.4.3 — all four attributions, DERIVED from the partner record (never sent
// by the client). Team is identified by its team lead; a partner who is a team
// lead is their own team's head.
function attributionFor(partner) {
  if (!partner) return { partnerId: null, partnerName: null, territory: null, teamId: null, teamLeadId: null, teamLeadName: null };
  const teamKey = partner.teamLead ? partner.id : (partner.teamLeadId || null);
  const teamLead = partner.teamLead ? partner : (partner.teamLeadId ? findPartner(partner.teamLeadId) : null);
  return {
    partnerId: partner.id,
    partnerName: partner.name,
    territory: partner.territory || null,
    teamId: teamKey,
    teamLeadId: teamLead ? teamLead.id : null,
    teamLeadName: teamLead ? teamLead.name : null
  };
}
// 6.4.5 — the ONLY shape of a lead a partner may see. Strips internalNotes,
// owner, assignedRep, nextAction, and internal attribution. Raw status/projectId
// are retained (not secret) but rendering maps them to the six partner labels.
function partnerView(lead) {
  if (!lead) return null;
  return {
    id: lead.id,
    partnerId: lead.partnerId,
    prospectName: lead.prospectName,
    phone: lead.phone,
    projectId: lead.projectId,
    projectName: lead.projectName,
    notes: lead.notes,                 // the partner's own submission note
    status: lead.status,               // raw internal value; client projects to 6 labels
    partnerStatus: PARTNER_STATUS[lead.status] || 'submitted',
    createdAt: lead.createdAt,
    timeline: (lead.timeline || []).map((t) => ({ status: t.status, at: t.at })),
    commissionId: lead.commissionId || null,
    // partner-facing follow-up notes only (added deliberately by staff)
    followUps: (lead.followUps || []).map((f) => ({ at: f.at, text: f.text })),
    consent: lead.consent && typeof lead.consent === 'object'
      ? { attested: !!lead.consent.attested, at: lead.consent.at } : { attested: !!lead.consent, at: lead.createdAt }
    // ABSENT by construction: internalNotes, owner, assignedRep, nextAction, attribution.
  };
}
// Back-fill four-way attribution + structured consent onto leads that predate
// the model (seed rows). Idempotent — runs on every load and reset.
function normalizeLeads(store) {
  (store.leads || []).forEach(function (l) {
    if (!l.attribution) l.attribution = attributionFor((store.partners || []).find((p) => p.id === l.partnerId));
    if (typeof l.consent !== 'object' || l.consent === null) {
      l.consent = { attested: !!l.consent, at: l.createdAt || new Date().toISOString(), statement: CONSENT_STATEMENT };
    }
    if (!Array.isArray(l.internalNotes)) l.internalNotes = [];
  });
}
normalizeLeads(db); // seed leads gain attribution + structured consent at boot
function findSettlement(id) { return db.settlements.find((s) => s.id === id); }

function terrCode(t) {
  const map = { dhaka: 'DHK', cumilla: 'CUM', chattogram: 'CTG', chittagong: 'CTG', sylhet: 'SYL', khulna: 'KHL', rajshahi: 'RAJ', barishal: 'BAR', rangpur: 'RNG', mymensingh: 'MYM' };
  const k = String(t || '').toLowerCase().trim();
  return map[k] || String(t || 'XXX').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'XXX';
}
function nextPartnerId(territory) {
  db.seq.partner += 1;
  return 'SDP-' + terrCode(territory) + '-' + String(db.seq.partner).padStart(5, '0');
}

// actor switcher — which partner is "logged in" in the mobile pane
app.post('/api/session/partner', (req, res) => {
  const id = req.body.partnerId;
  if (id === null || id === 'new') {
    db.session.partnerId = null; db.session.applicantId = null;
    emit('partner.session', { partnerId: null }, []);
    return res.json({ ok: true, partnerId: null });
  }
  const p = findPartner(id);
  if (!p) return res.status(404).json({ error: 'partner not found' });
  db.session.partnerId = p.id; db.session.applicantId = null;
  emit('partner.session', { partnerId: p.id }, []);
  res.json({ partner: p });
});

// FLOW 1 — registration → approval wall
app.post('/api/partners/apply', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: 'name and phone required' });
  db.seq.app += 1;
  // territory is captured as a full Division › District › Upazila › Union path;
  // the district string is retained for IDs, dense tables and legacy displays.
  const geo = Geo.complete(b.geo || Geo.fromName(b.territory));
  const app_ = {
    id: 'APP-2024-' + String(db.seq.app).padStart(4, '0'),
    name: b.name, phone: b.phone, email: b.email || '', nid: b.nid || '',
    address: b.address || '', territory: geo.district || b.territory || '', geo: geo, program: b.program || 'zero',
    referralCode: b.referralCode || '', status: 'pending', reason: null,
    createdAt: new Date().toISOString()
  };
  db.applications.unshift(app_);
  db.session.applicantId = app_.id;
  db.session.partnerId = null;
  pushNote('admin', { kind: 'partner.applied', title: 'New partner application', body: `${app_.name} · ${app_.territory} · ${programLabel(app_.program)}`, refId: app_.id });
  emit('partner.applied', { application: app_ }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/partners/apply', `${app_.name} applied — ${app_.territory}`, 'req', app_.id),
    feedEntry('←', 'server', 'admin', '', 'event: partner.applied', `delivered to approval queue — ${programLabel(app_.program)}`, 'evt', app_.id)
  ]);
  res.status(201).json({ application: app_ });
});

function programLabel(p) { return p === 'with' ? 'With Investment' : p === 'both' ? 'Both programs' : 'Zero Investment'; }

app.post('/api/partners/approve', (req, res) => {
  if (!requirePermission('partner.approve', res)) return;
  const app_ = findApplication(req.body.applicationId);
  if (!app_) return res.status(404).json({ error: 'application not found' });
  if (app_.status !== 'pending') return res.status(409).json({ error: 'already decided' });
  const territory = req.body.territory || app_.territory;
  // keep the applicant's full path unless a reviewer typed a different district
  const geo = (req.body.territory && req.body.territory !== (app_.geo && app_.geo.district))
    ? Geo.complete(Geo.fromName(req.body.territory))
    : (app_.geo || Geo.complete(Geo.fromName(territory)));
  const now = new Date().toISOString();
  // 6.3.2 — enrolment is a set: honour zero / with / both from the application.
  // 6.3.4 / 6.1 gate — With Investment is NOT auto-activated on approval; it is
  // recorded as an activation request that a Super Admin must approve (activate).
  const wantsZero = app_.program === 'zero' || app_.program === 'both';
  const wantsWith = app_.program === 'with' || app_.program === 'both';
  const participation = {
    zero: mkPart(wantsZero, now),
    with: wantsWith
      ? { status: 'notEnrolled', enrolledAt: null, requestedAt: now, history: [{ status: 'requested', at: now, reason: 'Requested at registration', by: app_.name }] }
      : mkPart(false, now)
  };
  const partner = {
    id: req.body.partnerId || nextPartnerId(territory),
    name: app_.name, phone: app_.phone, email: app_.email, nid: app_.nid, address: app_.address,
    territory: geo.district || territory, geo: geo, participation,
    rank: req.body.rank || 'Silver', teamLead: false, teamLeadId: null,
    status: 'active', createdAt: now,
    referralCode: (app_.name.split(' ').pop() || 'SDP').toUpperCase().slice(0, 6) + db.seq.partner,
    approvedBalanceBdt: 0, note: req.body.note || ''
  };
  partner.card = { name: partner.name, id: partner.id, rank: partner.rank, territory: partner.territory, geo: partner.geo, phone: partner.phone, qr: 'salmon://partner/' + partner.id };
  syncProgramString(partner);
  db.partners.push(partner);
  app_.status = 'approved';
  app_.partnerId = partner.id;
  if (db.session.applicantId === app_.id) db.session.partnerId = partner.id; // live reveal on the phone
  pushNote('partner', { kind: 'partner.approved', title: 'You’re approved!', body: `Partner ID ${partner.id} · ${partner.rank}`, refId: partner.id, pid: partner.id });
  emit('partner.approved', { application: app_, partner }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/partners/approve', `Approved ${partner.name} — ${partner.id}`, 'req', partner.id),
    feedEntry('←', 'server', 'partner', '', 'event: partner.approved', "partner's wall resolves to welcome", 'evt', app_.id)
  ]);
  res.json({ partner });
});

app.post('/api/partners/reject', (req, res) => {
  if (!requirePermission('partner.reject', res)) return;
  const app_ = findApplication(req.body.applicationId);
  if (!app_) return res.status(404).json({ error: 'application not found' });
  app_.status = 'rejected';
  app_.reason = req.body.reason || 'Application not approved.';
  pushNote('partner', { kind: 'partner.rejected', title: 'Application not approved', body: app_.reason, refId: app_.id });
  emit('partner.rejected', { application: app_ }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/partners/reject', `Rejected ${app_.name}`, 'req', app_.id),
    feedEntry('←', 'server', 'partner', '', 'event: partner.rejected', `reason delivered verbatim to phone`, 'evt', app_.id)
  ]);
  res.json({ application: app_ });
});

// FLOW 1b — program enrolment & participation (Req 6.3)
// -----------------------------------------------------------------------------
// Partner enrols in a program AFTER approval. Zero → active immediately (low
// risk). With → records an activation request (stays notEnrolled, shown
// "available on approval"); a Super Admin activates it. Enrolment is a SET —
// a partner may hold both. Nothing here can be deleted.
const PROG_KEYS = { zero: 'zero', with: 'with' };
function progName(k) { return k === 'with' ? 'With Investment' : 'Zero Investment'; }

app.post('/api/partners/enrol', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  const key = PROG_KEYS[req.body.program];
  if (!key) return res.status(400).json({ error: 'program must be zero or with' });
  const part = partner.participation[key];
  if (part.status === 'active') return res.status(409).json({ error: 'already active in ' + progName(key) });
  const now = new Date().toISOString();
  let mobileMsg;
  if (key === 'zero') {
    // Zero Investment self-activates on enrol.
    part.status = 'active';
    part.enrolledAt = now;
    part.requestedAt = null;
    part.history.push({ status: 'active', at: now, reason: 'Self-enrolled', by: partner.name });
    mobileMsg = 'You are now enrolled in Zero Investment.';
  } else {
    // With Investment — record an activation request; admin (6.1 gate) must approve.
    part.requestedAt = now;
    part.history.push({ status: 'requested', at: now, reason: 'Enrolment requested by partner', by: partner.name });
    mobileMsg = 'Your With Investment enrolment request is awaiting review.';
  }
  syncProgramString(partner);
  save();
  pushNote('admin', { kind: 'program.enrol', title: 'Program enrolment', body: partner.name + ' — ' + progName(key) + (key === 'with' ? ' (activation requested)' : ' (active)'), refId: partner.id });
  pushNote('partner', { kind: 'program.enrol', title: progName(key), body: mobileMsg, refId: partner.id, pid: partner.id });
  emit('program.enrol', { partnerId: partner.id, program: key, participation: partner.participation }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/partners/enrol', partner.name + ' enrolled — ' + progName(key), 'req', partner.id),
    feedEntry('←', 'server', 'admin', '', 'event: program.enrol', key === 'with' ? 'activation request in participation panel' : 'program active on the phone', 'evt', partner.id)
  ]);
  res.status(201).json({ participation: partner.participation });
});

// Admin activate / suspend / close a partner's participation in ONE program.
// activate-with is Super-Admin-only (the 6.1 eligibility approval). Suspend and
// close require a reason; both RETAIN the record and its history.
app.post('/api/partners/participation', (req, res) => {
  const key = PROG_KEYS[req.body.program];
  const action = req.body.action; // 'activate' | 'suspend' | 'close'
  if (!key) return res.status(400).json({ error: 'program must be zero or with' });
  if (['activate', 'suspend', 'close'].indexOf(action) < 0) return res.status(400).json({ error: 'bad action' });
  const permAction = (action === 'activate' && key === 'with') ? 'program.activate.with' : 'program.participation';
  if (!requirePermission(permAction, res)) return;
  const partner = findPartner(req.body.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  const part = partner.participation[key];
  const from = part.status;
  const reason = (req.body.reason || '').trim();
  if ((action === 'suspend' || action === 'close') && !reason) return res.status(400).json({ error: 'reason required' });
  const now = new Date().toISOString();
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const by = staff ? staff.name + ' · ' + staff.role : 'Admin';
  let to;
  if (action === 'activate') {
    if (from === 'active') return res.status(409).json({ error: 'already active' });
    if (from === 'closed') return res.status(409).json({ error: 'participation closed — cannot re-activate a closed record' });
    to = 'active';
    if (!part.enrolledAt) part.enrolledAt = now;
    part.requestedAt = null;
  } else if (action === 'suspend') {
    if (from !== 'active') return res.status(409).json({ error: 'can only suspend an active program' });
    to = 'suspended';
  } else { // close
    if (from === 'closed') return res.status(409).json({ error: 'already closed' });
    to = 'closed';
  }
  part.status = to;
  part.history.push({ status: to, at: now, reason: reason || null, by: by });
  syncProgramString(partner);
  save();
  const label = { activate: 'activated', suspend: 'suspended', close: 'closed' }[action];
  pushNote('partner', { kind: 'program.participation', title: progName(key) + ' ' + label, body: reason || (progName(key) + ' is now ' + to + '.'), refId: partner.id, pid: partner.id });
  emit('program.participation', { partnerId: partner.id, program: key, from: from, to: to, participation: partner.participation }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/partners/participation', partner.name + ' — ' + progName(key) + ': ' + from + ' → ' + to, 'req', partner.id),
    feedEntry('←', 'server', 'partner', '', 'event: program.participation', 'P19 reflects ' + to + (reason ? ' — reason delivered' : ''), 'evt', partner.id)
  ]);
  res.json({ participation: partner.participation });
});

// FLOW 3 — the lead loop
app.post('/api/leads', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  if (!req.body.consent) return res.status(400).json({ error: 'referral consent required' });
  const project = findProject(req.body.projectId);
  db.seq.lead += 1;
  const nowIso = new Date().toISOString();
  const lead = {
    id: 'LEAD-2024-' + String(db.seq.lead).padStart(4, '0'),
    partnerId: partner.id, partnerName: partner.name,
    // 6.4.3 — all four attributions stamped server-side from the partner record.
    attribution: attributionFor(partner),
    prospectName: req.body.prospectName || 'Prospect', phone: req.body.phone || '',
    email: req.body.email || '',
    // 6.4 — the referred person's interest: potential buyer or investor
    leadType: req.body.leadType === 'investor' ? 'investor' : 'buyer',
    projectId: req.body.projectId || null, projectName: project ? project.name : (req.body.projectName || '—'),
    notes: req.body.notes || '',
    // 6.4.2 — per-lead consent recorded with attestation text + timestamp.
    consent: { attested: true, at: nowIso, statement: CONSENT_STATEMENT },
    status: 'new', createdAt: nowIso,
    timeline: [{ status: 'new', at: nowIso }],
    internalNotes: []
  };
  db.leads.unshift(lead);
  pushNote('admin', { kind: 'lead.created', title: 'New lead', body: `${lead.prospectName} · ${lead.projectName} · from ${partner.name}`, refId: lead.id });
  emit('lead.created', { lead }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/leads', `${partner.name} submitted lead — ${lead.prospectName}`, 'req', lead.id),
    feedEntry('←', 'server', 'admin', '', 'event: lead.created', `delivered to leads queue — ${lead.projectName}`, 'evt', lead.id)
  ]);
  res.status(201).json({ lead });
});

app.post('/api/leads/status', (req, res) => {
  if (!requirePermission('lead.manage', res)) return;
  const lead = findLead(req.body.leadId);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  const allowed = ['new', 'contacted', 'meeting_scheduled', 'meeting_done', 'visit_scheduled', 'visit_done', 'converted', 'rejected'];
  if (req.body.status) {
    if (allowed.indexOf(req.body.status) < 0) return res.status(400).json({ error: 'bad status' });
    lead.status = req.body.status;
    lead.timeline.push({ status: req.body.status, at: new Date().toISOString() });
  }
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const staffName = staff ? staff.name : 'Staff';
  if (req.body.internalNote) {
    lead.internalNotes.push({ at: new Date().toISOString(), by: staffName, text: req.body.internalNote });
  }
  // Partner-facing follow-up note — the ONE lead field a partner is allowed to read.
  if (req.body.followUpNote) {
    lead.followUps = lead.followUps || [];
    lead.followUps.push({ at: new Date().toISOString(), by: staffName, text: req.body.followUpNote });
  }
  // Assigned representative + next action are INTERNAL (never projected to partner).
  if (req.body.assignedRep !== undefined) lead.assignedRep = req.body.assignedRep || '';
  if (req.body.nextAction !== undefined) lead.nextAction = req.body.nextAction || '';
  const label = (req.body.status || 'note').replace(/_/g, ' ');
  if (req.body.followUpNote) pushNote('partner', { kind: 'lead.followup', title: 'Update on your lead', body: `${lead.prospectName} — Salmon added a follow-up note`, refId: lead.id, pid: lead.partnerId });
  // Broadcast the PROJECTION only — a just-added internal note must not ride the
  // wire to the partner browser. Admin refreshes full state from its own fetch.
  emit('lead.status', { leadId: lead.id, lead: partnerView(lead), statusChanged: !!req.body.status, noteAdded: !!req.body.internalNote }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/leads/status', req.body.status ? `${lead.prospectName} → ${label}` : `internal note added (private)`, 'req', lead.id),
    feedEntry('←', 'server', 'partner', '', 'event: lead.status', req.body.status ? `partner timeline advances` : `not shown to partner`, 'evt', lead.id)
  ]);
  res.json({ lead });
});

// Advance a lead to Meeting scheduled by CREATING a meeting (date/time/tz/reason/
// client email/platform). The meeting shows in admin Meetings + the partner's list.
app.post('/api/leads/schedule-meeting', (req, res) => {
  if (!requirePermission('lead.manage', res)) return;
  const lead = findLead(req.body.leadId);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  const b = req.body;
  db.seq.meeting += 1;
  const platform = b.platform === 'meet' ? 'Google Meet' : 'Zoom';
  const m = {
    id: 'MTG-2024-' + String(db.seq.meeting).padStart(4, '0'),
    partnerId: lead.partnerId, partnerName: lead.partnerName,
    kind: 'lead', leadId: lead.id, prospectName: lead.prospectName,
    withName: b.withName || 'Manager', staffType: b.withName || 'Manager',
    date: b.date || '', time: b.time || '', timezone: b.timezone || 'Asia/Dhaka',
    reason: b.reason || 'Lead meeting', clientEmail: b.clientEmail || lead.email || '',
    platform, status: 'scheduled', requestedAt: new Date().toISOString(),
    link: (b.platform === 'meet' ? 'https://meet.google.com/salmon-' : 'https://zoom.us/j/salmon-') + m_slug(db.seq.meeting)
  };
  m.time = m.date && m.time ? `${m.date} ${m.time} (${m.timezone})` : m.time;
  db.meetings.unshift(m);
  lead.status = 'meeting_scheduled';
  lead.timeline.push({ status: 'meeting_scheduled', at: new Date().toISOString() });
  pushNote('partner', { kind: 'meeting.scheduled', title: 'Meeting scheduled', body: `${m.reason} · ${b.date} ${b.time} · ${platform}`, refId: m.id, pid: lead.partnerId });
  emit('lead.status', { leadId: lead.id, lead: partnerView(lead), statusChanged: true }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/leads/schedule-meeting', `Meeting scheduled — ${lead.prospectName} · ${platform}`, 'req', lead.id),
    feedEntry('←', 'server', 'partner', '', 'event: meeting.scheduled', 'partner meetings + timeline update', 'evt', lead.id)
  ]);
  res.json({ meeting: m, lead });
});
function m_slug(n) { return ('mtg' + n); }

// Advance a lead to Visit scheduled → records a Consultation / visit (date/place).
app.post('/api/leads/schedule-visit', (req, res) => {
  if (!requirePermission('lead.manage', res)) return;
  const lead = findLead(req.body.leadId);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  const b = req.body;
  db.consultations = db.consultations || [];
  db.seq.consultation = (db.seq.consultation || 0) + 1;
  const v = {
    id: 'VIS-2024-' + String(db.seq.consultation).padStart(4, '0'),
    kind: 'visit', partnerId: lead.partnerId, partnerName: lead.partnerName,
    leadId: lead.id, prospectName: lead.prospectName, clientName: lead.prospectName,
    date: b.date || '', time: b.time || '', timezone: b.timezone || 'Asia/Dhaka',
    place: b.place || '', notes: b.notes || '',
    status: 'scheduled', createdAt: new Date().toISOString()
  };
  db.consultations.unshift(v);
  lead.status = 'visit_scheduled';
  lead.timeline.push({ status: 'visit_scheduled', at: new Date().toISOString() });
  pushNote('partner', { kind: 'visit.scheduled', title: 'Site visit scheduled', body: `${v.place} · ${b.date} ${b.time}`, refId: v.id, pid: lead.partnerId });
  emit('lead.status', { leadId: lead.id, lead: partnerView(lead), statusChanged: true }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/leads/schedule-visit', `Site visit scheduled — ${lead.prospectName} · ${v.place}`, 'req', lead.id),
    feedEntry('←', 'server', 'partner', '', 'event: visit.scheduled', 'partner visits + timeline update', 'evt', lead.id)
  ]);
  res.json({ visit: v, lead });
});

app.post('/api/leads/verify-conversion', (req, res) => {
  if (!requirePermission('lead.convert', res)) return;
  const lead = findLead(req.body.leadId);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  lead.status = 'converted';
  lead.timeline.push({ status: 'converted', at: new Date().toISOString() });
  const partner = findPartner(lead.partnerId);
  db.seq.commission += 1;
  const staffV = db.staff.find((s) => s.id === db.session.staffId);
  const commission = {
    id: 'COM-2024-' + String(db.seq.commission).padStart(4, '0'),
    kind: 'conversion', category: null,
    partnerId: lead.partnerId, partnerName: lead.partnerName,
    program: partner ? partner.program : 'zero',
    leadId: lead.id, prospectName: lead.prospectName,
    projectId: lead.projectId, projectName: lead.projectName,
    verifiedAt: new Date().toISOString(), verifiedBy: staffV ? staffV.name : 'Manager',
    status: 'pending', amountBdt: null, note: '', approvedAt: null, approver: null, events: []
  };
  pushAudit(commission, 'created', 'From verified conversion of ' + lead.prospectName);
  db.commissions.unshift(commission);
  lead.commissionId = commission.id;
  pushNote('admin', { kind: 'commission.created', title: 'Conversion verified', body: `Commission pending — ${lead.prospectName} · ${lead.projectName}`, refId: commission.id });
  pushNote('partner', { kind: 'lead.converted', title: 'Lead converted!', body: `${lead.prospectName} · ${lead.projectName}`, refId: lead.id, pid: lead.partnerId });
  // Partner-facing event carries the projection only (no internal notes/owner).
  emit('lead.converted', { leadId: lead.id, lead: partnerView(lead), commission }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/leads/verify-conversion', `Conversion verified — ${lead.prospectName}`, 'req', lead.id),
    feedEntry('←', 'server', 'admin', '', 'event: commission.created', `commission ${commission.id} pending finance`, 'evt', commission.id),
    feedEntry('←', 'server', 'partner', '', 'event: lead.converted', `partner sees Converted`, 'evt', lead.id)
  ]);
  res.json({ lead, commission });
});

// FLOW 4 — commission approval
app.post('/api/commissions/approve', (req, res) => {
  if (!requirePermission('commission.approve', res)) return;
  const c = findCommission(req.body.commissionId);
  if (!c) return res.status(404).json({ error: 'commission not found' });
  if (c.status === 'approved') return res.status(409).json({ error: 'already approved' });
  const amount = Number(req.body.amountBdt);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  c.amountBdt = amount;
  c.status = 'approved';
  c.note = req.body.note || '';
  if (req.body.program) c.program = req.body.program;
  c.approvedAt = new Date().toISOString();
  c.approver = staff ? staff.name : 'Finance';
  const partner = findPartner(c.partnerId);
  if (partner) partner.approvedBalanceBdt = (partner.approvedBalanceBdt || 0) + amount;
  pushAudit(c, 'approved', `${bdt(amount)} approved · ${c.note || 'no note'}`);
  pushNote('partner', { kind: 'commission.approved', title: 'Commission approved', body: `${bdt(amount)} for ${c.prospectName || 'you'}${c.projectName ? ' (' + c.projectName + ')' : ''}`, refId: c.id, pid: c.partnerId });
  emit('commission.approved', { commissionId: c.id, commission: c, partnerId: c.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/commissions/approve', `Approved ${bdt(amount)} — ${c.prospectName || c.partnerName}`, 'req', c.id),
    feedEntry('←', 'server', 'partner', '', 'event: commission.approved', `approved balance jumps to ${bdt(partner ? partner.approvedBalanceBdt : amount)}`, 'evt', c.id)
  ]);
  res.json({ commission: c });
});

// CM02 — create a commission record (Pending). From a verified conversion, OR a
// special case (bonus/adjustment). Amount is NEVER auto-calculated (clause 6);
// it is entered by a human at approval (CM03).
app.post('/api/commissions', (req, res) => {
  if (!requirePermission('commission.create', res)) return;
  const b = req.body || {};
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  db.seq.commission += 1;
  let commission;
  if (b.mode === 'special') {
    const partner = findPartner(b.partnerId);
    if (!partner) return res.status(404).json({ error: 'partner not found' });
    if (!b.reason) return res.status(400).json({ error: 'reason required for a special-commission case' });
    commission = {
      id: 'COM-2024-' + String(db.seq.commission).padStart(4, '0'),
      kind: 'special', category: b.category || 'Bonus',
      partnerId: partner.id, partnerName: partner.name, program: partner.program,
      leadId: null, prospectName: null, projectId: null, projectName: null,
      verifiedAt: null, verifiedBy: null, reason: b.reason,
      status: 'pending', amountBdt: null, note: '', approvedAt: null, approver: null, events: []
    };
    pushAudit(commission, 'created', `Special case (${commission.category}): ${b.reason}`);
  } else {
    const lead = findLead(b.leadId);
    if (!lead || lead.status !== 'converted') return res.status(400).json({ error: 'a verified converted lead is required' });
    if (lead.commissionId) return res.status(409).json({ error: 'commission already exists for this conversion' });
    const partner = findPartner(lead.partnerId);
    commission = {
      id: 'COM-2024-' + String(db.seq.commission).padStart(4, '0'),
      kind: 'conversion', category: null,
      partnerId: lead.partnerId, partnerName: lead.partnerName, program: partner ? partner.program : 'zero',
      leadId: lead.id, prospectName: lead.prospectName, projectId: lead.projectId, projectName: lead.projectName,
      verifiedAt: lead.timeline ? (lead.timeline.find((t) => t.status === 'converted') || {}).at : null, verifiedBy: null,
      status: 'pending', amountBdt: null, note: '', approvedAt: null, approver: null, events: []
    };
    lead.commissionId = commission.id;
    pushAudit(commission, 'created', 'From verified conversion of ' + lead.prospectName);
  }
  db.commissions.unshift(commission);
  pushNote('admin', { kind: 'commission.created', title: 'Commission record created', body: (commission.kind === 'special' ? 'Special · ' + commission.category : commission.prospectName) + ' · ' + commission.partnerName, refId: commission.id });
  emit('commission.created', { commission }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/commissions', `Created ${commission.kind} commission — ${commission.partnerName}`, 'req', commission.id),
    feedEntry('←', 'server', 'admin', '', 'event: commission.created', 'pending finance approval', 'evt', commission.id)
  ]);
  res.status(201).json({ commission });
});

// CM06 — correct an amount (mandatory reason, old→new audit; adjusts balance if approved)
app.post('/api/commissions/correct', (req, res) => {
  if (!requirePermission('commission.correct', res)) return;
  const c = findCommission(req.body.commissionId);
  if (!c) return res.status(404).json({ error: 'commission not found' });
  const amount = Number(req.body.amountBdt);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
  if (!req.body.reason) return res.status(400).json({ error: 'reason is mandatory for a correction' });
  const old = c.amountBdt || 0;
  const partner = findPartner(c.partnerId);
  if (partner && (c.status === 'approved' || c.status === 'settlement_requested')) {
    partner.approvedBalanceBdt = Math.max(0, (partner.approvedBalanceBdt || 0) - old + amount);
  }
  c.amountBdt = amount;
  pushAudit(c, 'corrected', `Amount ${bdt(old)} → ${bdt(amount)}. Reason: ${req.body.reason}`);
  pushNote('partner', { kind: 'commission.corrected', title: 'Commission corrected', body: `${bdt(old)} → ${bdt(amount)} · ${req.body.reason}`, refId: c.id, pid: c.partnerId });
  emit('commission.corrected', { commissionId: c.id, commission: c, partnerId: c.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/commissions/correct', `Corrected ${c.id}: ${bdt(old)} → ${bdt(amount)}`, 'req', c.id),
    feedEntry('←', 'server', 'partner', '', 'event: commission.corrected', 'partner sees the honest adjustment', 'evt', c.id)
  ]);
  res.json({ commission: c });
});

// CM06 — reverse an approved/settled commission (mandatory reason, audited, balance clawed back)
app.post('/api/commissions/reverse', (req, res) => {
  if (!requirePermission('commission.correct', res)) return;
  const c = findCommission(req.body.commissionId);
  if (!c) return res.status(404).json({ error: 'commission not found' });
  if (!req.body.reason) return res.status(400).json({ error: 'reason is mandatory for a reversal' });
  if (c.status === 'reversed') return res.status(409).json({ error: 'already reversed' });
  const partner = findPartner(c.partnerId);
  const clawed = (c.status === 'approved' || c.status === 'settlement_requested') ? (c.amountBdt || 0) : 0;
  if (partner && clawed) partner.approvedBalanceBdt = Math.max(0, (partner.approvedBalanceBdt || 0) - clawed);
  c.reversedFrom = c.status;
  c.status = 'reversed';
  c.reversalReason = req.body.reason;
  pushAudit(c, 'reversed', `Reversed from ${c.reversedFrom}. ${clawed ? 'Clawed back ' + bdt(clawed) + '. ' : ''}Reason: ${req.body.reason}`);
  pushNote('partner', { kind: 'commission.reversed', title: 'Commission reversed', body: `${bdt(c.amountBdt)} · ${req.body.reason}`, refId: c.id, pid: c.partnerId });
  emit('commission.reversed', { commissionId: c.id, commission: c, partnerId: c.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/commissions/reverse', `Reversed ${c.id} — ${req.body.reason}`, 'req', c.id),
    feedEntry('←', 'server', 'partner', '', 'event: commission.reversed', 'partner sees the reversal honestly', 'evt', c.id)
  ]);
  res.json({ commission: c });
});

// FLOW 5 — settlement request → approve → mark settled  (NO bank fields anywhere)
app.post('/api/settlements/request', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  const amount = Number(req.body.amountBdt);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
  if (amount > (partner.approvedBalanceBdt || 0)) return res.status(400).json({ error: 'exceeds approved balance' });
  db.seq.settlement += 1;
  const s = {
    id: 'SLT-2024-' + String(db.seq.settlement).padStart(4, '0'),
    partnerId: partner.id, partnerName: partner.name, amountBdt: amount,
    status: 'requested', requestedAt: new Date().toISOString(),
    channel: null, reference: null, paymentDate: null
  };
  db.settlements.unshift(s);
  // reflect the state on the underlying commissions (clause 3 ledger lifecycle)
  db.commissions.forEach((c) => { if (c.partnerId === partner.id && c.status === 'approved') { c.status = 'settlement_requested'; c.settlementId = s.id; pushAudit(c, 'settlement_requested', 'Included in settlement ' + s.id); } });
  pushNote('admin', { kind: 'settlement.requested', title: 'Settlement request', body: `${bdt(amount)} from ${partner.name}`, refId: s.id });
  emit('settlement.requested', { settlement: s }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/settlements/request', `${partner.name} requested ${bdt(amount)}`, 'req', s.id),
    feedEntry('←', 'server', 'admin', '', 'event: settlement.requested', `delivered to settlement queue`, 'evt', s.id)
  ]);
  res.status(201).json({ settlement: s });
});

app.post('/api/settlements/approve', (req, res) => {
  if (!requirePermission('settlement.approve', res)) return;
  const s = findSettlement(req.body.settlementId);
  if (!s) return res.status(404).json({ error: 'settlement not found' });
  s.status = 'approved_awaiting_payment';
  s.approvedAt = new Date().toISOString();
  pushNote('partner', { kind: 'settlement.approved', title: 'Settlement approved', body: `${bdt(s.amountBdt)} — awaiting payment`, refId: s.id, pid: s.partnerId });
  emit('settlement.approved', { settlementId: s.id, settlement: s, partnerId: s.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/settlements/approve', `Approved settlement ${s.id}`, 'req', s.id),
    feedEntry('←', 'server', 'partner', '', 'event: settlement.approved', `partner sees Approved (awaiting payment)`, 'evt', s.id)
  ]);
  res.json({ settlement: s });
});

app.post('/api/settlements/settle', (req, res) => {
  if (!requirePermission('settlement.settle', res)) return;
  const s = findSettlement(req.body.settlementId);
  if (!s) return res.status(404).json({ error: 'settlement not found' });
  s.status = 'settled';
  s.settledAt = new Date().toISOString();
  s.paymentDate = req.body.paymentDate || new Date().toISOString().slice(0, 10);
  s.channel = req.body.channel || 'Cash';       // category only — never an account number
  s.reference = req.body.reference || s.id;      // non-sensitive finance reference (staff-only)
  s.evidence = req.body.evidence || null;        // proof (staff-only; never shown to member)
  s.settledBy = (db.staff.find((x) => x.id === db.session.staffId) || {}).name || 'Finance';
  const partner = findPartner(s.partnerId);
  if (partner) partner.approvedBalanceBdt = Math.max(0, (partner.approvedBalanceBdt || 0) - s.amountBdt);
  // commissions in this settlement move to Settled (clause 3 ledger lifecycle)
  db.commissions.forEach((c) => { if (c.settlementId === s.id && c.status === 'settlement_requested') { c.status = 'settled'; pushAudit(c, 'settled', 'Paid via ' + s.channel + ' · ref ' + s.reference); } });
  // member sees STATUS only — no finance reference or evidence in the notification
  pushNote('partner', { kind: 'settlement.settled', title: 'Settled', body: `${bdt(s.amountBdt)} — your settlement is complete`, refId: s.id, pid: s.partnerId });
  emit('settlement.settled', { settlementId: s.id, settlement: s, partnerId: s.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/settlements/settle', `Marked settled ${s.id} · ${s.channel}`, 'req', s.id),
    feedEntry('←', 'server', 'partner', '', 'event: settlement.settled', `partner sees Settled · ${s.reference}`, 'evt', s.id)
  ]);
  res.json({ settlement: s });
});

// Delayed / disputed settlement → placed on hold with a mandatory audit reason.
app.post('/api/settlements/hold', (req, res) => {
  if (!requirePermission('settlement.approve', res)) return;
  const s = findSettlement(req.body.settlementId);
  if (!s) return res.status(404).json({ error: 'settlement not found' });
  if (!req.body.reason) return res.status(400).json({ error: 'audit reason required' });
  s.status = 'on_hold';
  s.holdReason = req.body.reason;   // staff-only
  s.heldBy = (db.staff.find((x) => x.id === db.session.staffId) || {}).name || 'Finance';
  pushNote('partner', { kind: 'settlement.hold', title: 'Settlement on hold', body: `${bdt(s.amountBdt)} — your request is temporarily on hold`, refId: s.id, pid: s.partnerId });
  emit('settlement.hold', { settlementId: s.id, settlement: s, partnerId: s.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/settlements/hold', `On hold ${s.id} — reason logged`, 'req', s.id),
    feedEntry('←', 'server', 'partner', '', 'event: settlement.hold', 'member sees On hold (reason stays internal)', 'evt', s.id)
  ]);
  res.json({ settlement: s });
});

// Reject a settlement request → return its commissions to Approved. Reason required.
app.post('/api/settlements/reject', (req, res) => {
  if (!requirePermission('settlement.approve', res)) return;
  const s = findSettlement(req.body.settlementId);
  if (!s) return res.status(404).json({ error: 'settlement not found' });
  if (!req.body.reason) return res.status(400).json({ error: 'audit reason required' });
  if (s.status === 'settled') return res.status(409).json({ error: 'already settled' });
  s.status = 'rejected';
  s.rejectReason = req.body.reason;  // staff-only
  s.rejectedBy = (db.staff.find((x) => x.id === db.session.staffId) || {}).name || 'Finance';
  // release the commissions back to Approved (balance was never deducted)
  db.commissions.forEach((c) => { if (c.settlementId === s.id && c.status === 'settlement_requested') { c.status = 'approved'; c.settlementId = null; pushAudit(c, 'settlement_rejected', 'Settlement ' + s.id + ' rejected'); } });
  pushNote('partner', { kind: 'settlement.rejected', title: 'Settlement not processed', body: `${bdt(s.amountBdt)} — please contact the partner desk`, refId: s.id, pid: s.partnerId });
  emit('settlement.rejected', { settlementId: s.id, settlement: s, partnerId: s.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/settlements/reject', `Rejected ${s.id} — commissions returned to Approved`, 'req', s.id),
    feedEntry('←', 'server', 'partner', '', 'event: settlement.rejected', 'member sees status only (reason stays internal)', 'evt', s.id)
  ]);
  res.json({ settlement: s });
});

// FLOW 6 — With Investment (mechanism only; amounts stay [LEGAL] placeholders)
app.post('/api/investment/enquire', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  db.seq.enquiry += 1;
  const e = {
    id: 'INV-ENQ-' + String(db.seq.enquiry).padStart(4, '0'),
    partnerId: partner.id, partnerName: partner.name,
    interestAmount: req.body.amount || '', contact: req.body.contact || 'Phone', notes: req.body.notes || '',
    status: 'new', createdAt: new Date().toISOString()
  };
  db.investmentEnquiries.unshift(e);
  pushNote('admin', { kind: 'investment.enquiry', title: 'Investment enquiry', body: `${partner.name} — With Investment interest`, refId: e.id });
  emit('investment.enquiry', { enquiry: e }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/investment/enquire', `${partner.name} enquired — With Investment`, 'req', e.id),
    feedEntry('←', 'server', 'admin', '', 'event: investment.enquiry', `delivered to investment queue (stub)`, 'evt', e.id)
  ]);
  res.status(201).json({ enquiry: e });
});

app.post('/api/investment/confirm-share', (req, res) => {
  if (!requirePermission('investment.confirm', res)) return;
  const e = db.investmentEnquiries.find((x) => x.id === req.body.enquiryId);
  if (!e) return res.status(404).json({ error: 'enquiry not found' });
  e.status = 'followed_up';
  const L = '[AMOUNT — LEGAL SIGN-OFF REQUIRED]';
  const share = {
    id: 'INV-2024-' + String(db.seq.enquiry).padStart(4, '0'),
    partnerId: e.partnerId, status: 'confirmed', shareLabel: L, confirmedAt: new Date().toISOString(),
    returnSchedule: [
      { n: 1, period: 'Q1 2027', status: 'pending', amount: L },
      { n: 2, period: 'Q2 2027', status: 'on_hold', amount: L }
    ]
  };
  db.investmentShares.push(share);
  pushNote('partner', { kind: 'investment.share', title: 'Investment share recorded', body: 'A confirmed share was recorded on your account.', refId: share.id, pid: share.partnerId });
  emit('investment.share', { enquiryId: e.id, share }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/investment/confirm-share', `Recorded confirmed share for ${e.partnerName}`, 'req', share.id),
    feedEntry('←', 'server', 'partner', '', 'event: investment.share', `share record appears (amounts = [LEGAL])`, 'evt', share.id)
  ]);
  res.json({ share });
});

// FLOW 6b — richer With-Investment: partner interest → admin-recorded investment
// → manually-recorded return schedule. NEVER calculates/guarantees/disburses.
app.post('/api/investments/interest', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  db.investmentInterests = db.investmentInterests || [];
  db.seq.invInterest = (db.seq.invInterest || 0) + 1;
  const project = findProject(req.body.projectId);
  const it = {
    id: 'INT-' + String(db.seq.invInterest).padStart(4, '0'),
    partnerId: partner.id, partnerName: partner.name,
    projectId: req.body.projectId || null, projectName: project ? project.name : (req.body.projectName || '—'),
    unitRef: req.body.unitRef || '',
    interestType: req.body.interestType === 'purchase' ? 'purchase' : 'invest',
    preferredTime: req.body.preferredTime || 'Anytime',
    notes: req.body.notes || '', status: 'new', createdAt: new Date().toISOString()
  };
  db.investmentInterests.unshift(it);
  pushNote('admin', { kind: 'investment.enquiry', title: 'Investment / purchase interest', body: `${partner.name} — ${it.interestType} · ${it.projectName}`, refId: it.id });
  emit('investment.interest', { interest: it }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/investments/interest', `${partner.name} registered ${it.interestType} interest — ${it.projectName}`, 'req', it.id),
    feedEntry('←', 'server', 'admin', '', 'event: investment.interest', 'delivered to the investment desk', 'evt', it.id)
  ]);
  res.status(201).json({ interest: it });
});

function recomputeInvestReturns(p) {
  const e = (p.invest && p.invest.entries) || [];
  p.invest.returnPaidBdt = e.filter((x) => x.status === 'paid').reduce((n, x) => n + (x.amountBdt || 0), 0);
  p.invest.returnPendingBdt = e.filter((x) => x.status === 'pending').reduce((n, x) => n + (x.amountBdt || 0), 0);
  p.invest.returnOnHoldBdt = e.filter((x) => x.status === 'onhold').reduce((n, x) => n + (x.amountBdt || 0), 0);
}

// Authorized staff record a CONFIRMED investment after offline documentation +
// payment verification. Effective date + client-approved commercial terms only.
app.post('/api/investments/record', (req, res) => {
  if (!requirePermission('investment.confirm', res)) return;
  const partner = findPartner(req.body.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  partner.invest = partner.invest || { entries: [] };
  partner.invest.investedBdt = Number(req.body.investedBdt) || partner.invest.investedBdt || 0;
  partner.invest.salesVolumeBdt = Number(req.body.salesVolumeBdt) || partner.invest.salesVolumeBdt || 0;
  partner.invest.effectiveDate = req.body.effectiveDate || new Date().toISOString().slice(0, 10);
  partner.invest.terms = req.body.terms || partner.invest.terms || 'Client-approved commercial terms (recorded offline)';
  partner.invest.schedule = req.body.schedule || partner.invest.schedule || 'Client-approved schedule';
  partner.invest.projectId = req.body.projectId || partner.invest.projectId || null;
  // recording a confirmed investment ESTABLISHES the record and starts a clean
  // return schedule — returns are then added deliberately (never carried over
  // from seed/dummy data). Keeps invested-amount and schedule consistent.
  partner.invest.entries = [];
  partner.invest.recordedBy = staff ? staff.name : 'Finance';
  partner.invest.recordedAt = new Date().toISOString();
  if (req.body.interestId) { const it = (db.investmentInterests || []).find((x) => x.id === req.body.interestId); if (it) it.status = 'recorded'; }
  recomputeInvestReturns(partner);
  pushNote('partner', { kind: 'investment.share', title: 'Investment recorded', body: 'Salmon recorded your confirmed investment.', refId: partner.id, pid: partner.id });
  emit('investment.recorded', { partnerId: partner.id, invest: partner.invest }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/investments/record', `Recorded investment for ${partner.name}`, 'req', partner.id),
    feedEntry('←', 'server', 'partner', '', 'event: investment.recorded', 'appears on the With-Investment dashboard', 'evt', partner.id)
  ]);
  res.json({ invest: partner.invest });
});

// Manually record a return entry (Paid / Pending / On Hold). Audit reason required.
app.post('/api/investments/return', (req, res) => {
  if (!requirePermission('investment.confirm', res)) return;
  const partner = findPartner(req.body.partnerId);
  if (!partner || !partner.invest) return res.status(404).json({ error: 'no investment on record' });
  if (!req.body.reason) return res.status(400).json({ error: 'audit reason required' });
  const status = ['paid', 'pending', 'onhold'].indexOf(req.body.status) >= 0 ? req.body.status : 'pending';
  partner.invest.entries = partner.invest.entries || [];
  const entry = { period: req.body.period || '—', amountBdt: Number(req.body.amountBdt) || 0, status, at: new Date().toISOString(), reason: req.body.reason, by: (db.staff.find((s) => s.id === db.session.staffId) || {}).name || 'Finance' };
  partner.invest.entries.push(entry);
  recomputeInvestReturns(partner);
  pushNote('partner', { kind: 'investment.share', title: 'Return update', body: `A return entry was ${status === 'paid' ? 'marked paid' : status === 'onhold' ? 'placed on hold' : 'recorded as pending'}.`, refId: partner.id, pid: partner.id });
  emit('investment.return', { partnerId: partner.id, entry, invest: partner.invest }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/investments/return', `Return ${status} · ${partner.name} · ${entry.period}`, 'req', partner.id),
    feedEntry('←', 'server', 'partner', '', 'event: investment.return', 'return schedule updates — never a guaranteed return', 'evt', partner.id)
  ]);
  res.json({ entry, invest: partner.invest });
});

// FLOW 8 — meetings + support
app.post('/api/meetings/request', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  if (!partner) return res.status(404).json({ error: 'partner not found' });
  db.seq.meeting += 1;
  const b = req.body;
  const platform = b.platform === 'meet' ? 'Google Meet' : b.platform === 'zoom' ? 'Zoom' : (b.platform || '');
  const m = {
    id: 'MTG-2024-' + String(db.seq.meeting).padStart(4, '0'),
    partnerId: partner.id, partnerName: partner.name,
    staffType: b.staffType || 'Manager', withName: b.staffType || 'Manager', notes: b.notes || '',
    date: b.date || '', preferredTime: b.time || '', timezone: b.timezone || 'Asia/Dhaka',
    reason: b.reason || '', adminEmail: b.adminEmail || '', platform: platform,
    status: 'requested', requestedAt: new Date().toISOString(), zoomLink: null, time: null
  };
  db.meetings.unshift(m);
  pushNote('admin', { kind: 'meeting.requested', title: 'Meeting request', body: `${partner.name} → ${m.staffType}${m.date ? ' · ' + m.date : ''}`, refId: m.id });
  emit('meeting.requested', { meeting: m }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/meetings/request', `${partner.name} requested a meeting`, 'req', m.id),
    feedEntry('←', 'server', 'admin', '', 'event: meeting.requested', `delivered to scheduler`, 'evt', m.id)
  ]);
  res.status(201).json({ meeting: m });
});

app.post('/api/meetings/confirm', (req, res) => {
  if (!requirePermission('meeting.confirm', res)) return;
  const m = db.meetings.find((x) => x.id === req.body.meetingId);
  if (!m) return res.status(404).json({ error: 'meeting not found' });
  m.status = 'confirmed';
  var base = m.platform === 'Google Meet' ? 'https://meet.google.com/salmon-' : 'https://zoom.us/j/salmon-';
  m.zoomLink = req.body.zoomLink || m.link || (base + m.id.toLowerCase());
  m.link = m.zoomLink;
  m.time = req.body.time || (m.date ? `${m.date} ${m.preferredTime || ''} (${m.timezone || 'Asia/Dhaka'})`.trim() : 'Tomorrow, 3:00 PM');
  pushNote('partner', { kind: 'meeting.confirmed', title: 'Meeting confirmed', body: `${m.time} · link ready`, refId: m.id, pid: m.partnerId });
  emit('meeting.confirmed', { meetingId: m.id, meeting: m, partnerId: m.partnerId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/meetings/confirm', `Confirmed meeting ${m.id}`, 'req', m.id),
    feedEntry('←', 'server', 'partner', '', 'event: meeting.confirmed', `partner sees confirmed meeting + link`, 'evt', m.id)
  ]);
  res.json({ meeting: m });
});

// ===========================================================================
// Req 6.16 — Support & Help Desk endpoints. Ticket create/respond/assign/
// prioritise/status/reopen/bulk + the client real-time chat channel. Every
// action ripples to the requester's surface and writes an audit history entry.
// ===========================================================================
function assignStaffForCategory(category) {
  const role = CATEGORY_ROUTING[category] || 'Manager';
  return db.staff.find((s) => s.role === role) || null;
}
function ticketHist(t, action, by, note) {
  t.history.unshift({ action: action, by: by || 'System', at: new Date().toISOString(), note: note || '' });
}
function notifyRequester(t, kind, title, body) {
  const side = t.source === 'client' ? 'client' : 'partner';
  pushNote(side, { kind: kind, title: title, body: body, refId: t.id });
  return side;
}

// 6.16.1 / 6.16.3 — create a ticket. Partner raises a structured ticket; a
// client can open one too (used by the in-app chat channel). Auto-routed by category.
app.post('/api/tickets', (req, res) => {
  const b = req.body || {};
  const source = b.source === 'client' ? 'client' : 'partner';
  let requester;
  if (source === 'client') {
    requester = findClient(b.clientId || db.session.clientId);
    if (!requester) return res.status(404).json({ error: 'client not found' });
  } else {
    requester = findPartner(b.partnerId || db.session.partnerId);
    if (!requester) return res.status(404).json({ error: 'partner not found' });
  }
  const category = TICKET_CATEGORIES.indexOf(b.category) >= 0 ? b.category : (b.dept === 'Technical' ? 'Customer Care' : (TICKET_CATEGORIES.indexOf(b.dept) >= 0 ? b.dept : 'Customer Care'));
  const priority = TICKET_PRIORITIES.indexOf(b.priority) >= 0 ? b.priority : 'normal';
  const channel = source === 'client' ? db.config.clientSupportChannel : 'ticket';
  db.seq.ticket += 1;
  const now = new Date().toISOString();
  const owner = assignStaffForCategory(category);
  const t = {
    id: 'TKT-2024-' + String(db.seq.ticket).padStart(4, '0'),
    source: source, requesterId: requester.id, requesterName: requester.name,
    partnerId: source === 'partner' ? requester.id : null, partnerName: source === 'partner' ? requester.name : null,
    clientId: source === 'client' ? requester.id : null, clientName: source === 'client' ? requester.name : null,
    category: category, dept: category, subject: b.subject || 'Support request',
    priority: priority, slaHours: SLA_HOURS[priority],
    status: 'open', channel: channel,
    assigneeId: owner ? owner.id : null, assigneeName: owner ? owner.name : null,
    createdAt: now, updatedAt: now, firstResponseAt: null, resolvedAt: null,
    attachments: Array.isArray(b.attachments) ? b.attachments : (b.attachment ? [b.attachment] : []),
    thread: [], replies: [], body: b.body || '',
    history: []
  };
  // WhatsApp channel: a ticket STUB only — never a faked transcript.
  if (source === 'client' && channel === 'whatsapp') {
    t.thread.push({ by: requester.name, side: 'system', at: now, kind: 'note', text: 'Conversation continues on WhatsApp Business — this stub tracks reference and status only. No transcript is stored in-app.' });
  } else if (b.body) {
    t.thread.push({ by: requester.name, side: 'requester', at: now, kind: 'message', text: b.body });
  }
  db.tickets.unshift(t);
  ticketHist(t, 'created', requester.name, source + ' · ' + category + (owner ? ' · routed to ' + owner.name : ''));
  pushNote('admin', { kind: 'ticket.created', title: 'New ' + source + ' ticket', body: requester.name + ' · ' + category + ' · ' + t.subject, refId: t.id });
  emit('ticket.created', { ticket: t }, [
    feedEntry('→', source, source, 'POST', '/api/tickets', `${requester.name} raised a ${category} ticket (${priority})`, 'req', t.id),
    feedEntry('←', 'server', 'admin', '', 'event: ticket.created', owner ? `routed to ${owner.name} in the queue` : 'delivered to support inbox', 'evt', t.id)
  ]);
  res.status(201).json({ ticket: t });
});

// 6.16.2 — staff respond (adds a staff turn, stamps first-response); optional resolve.
app.post('/api/tickets/reply', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  const text = req.body.body || '';
  if (text) {
    t.thread.push({ by: staff ? staff.name : 'Support', byRole: staff ? staff.role : null, side: 'staff', at: now, kind: 'message', text: text });
    t.replies.push({ by: staff ? staff.name : 'Support', at: now, text: text }); // legacy mirror
  }
  if (t.firstResponseAt == null) t.firstResponseAt = now;
  if (t.status === 'open' || t.status === 'reopened') t.status = 'in_progress';
  if (req.body.resolve || req.body.close) { t.status = 'resolved'; t.resolvedAt = now; }
  t.updatedAt = now;
  ticketHist(t, req.body.resolve || req.body.close ? 'resolved' : 'reply', staff ? staff.name : 'Support', text ? text.slice(0, 60) : '');
  const side = notifyRequester(t, 'ticket.replied', t.status === 'resolved' ? 'Ticket resolved' : 'Support replied', t.subject);
  emit('ticket.replied', { ticketId: t.id, ticket: t, partnerId: t.partnerId, clientId: t.clientId, source: t.source }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/tickets/reply', `Replied to ${t.id}${t.status === 'resolved' ? ' + resolved' : ''}`, 'req', t.id),
    feedEntry('←', 'server', side, '', 'event: ticket.replied', `${side} sees the ${t.status === 'resolved' ? 'resolution' : 'reply'}`, 'evt', t.id)
  ]);
  res.json({ ticket: t });
});

// 6.16.2 — assign an owner.
app.post('/api/tickets/assign', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  const owner = db.staff.find((s) => s.id === req.body.assigneeId) || null;
  t.assigneeId = owner ? owner.id : null;
  t.assigneeName = owner ? owner.name : null;
  t.updatedAt = new Date().toISOString();
  ticketHist(t, 'assigned', (db.staff.find((s) => s.id === db.session.staffId) || {}).name, owner ? owner.name + ' (' + owner.role + ')' : 'unassigned');
  emit('ticket.updated', { ticket: t }, [feedEntry('→', 'admin', 'admin', 'POST', '/api/tickets/assign', `${t.id} assigned to ${owner ? owner.name : 'nobody'}`, 'req', t.id)]);
  res.json({ ticket: t });
});

// 6.16.2 — set priority.
app.post('/api/tickets/priority', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  if (TICKET_PRIORITIES.indexOf(req.body.priority) < 0) return res.status(400).json({ error: 'invalid priority' });
  const prev = t.priority;
  t.priority = req.body.priority;
  t.slaHours = SLA_HOURS[t.priority];
  t.updatedAt = new Date().toISOString();
  ticketHist(t, 'priority', (db.staff.find((s) => s.id === db.session.staffId) || {}).name, prev + ' → ' + t.priority);
  emit('ticket.updated', { ticket: t }, [feedEntry('→', 'admin', 'admin', 'POST', '/api/tickets/priority', `${t.id} priority ${prev} → ${t.priority}`, 'req', t.id)]);
  res.json({ ticket: t });
});

// 6.16.2 — set status (open / in_progress / resolved / reopened).
app.post('/api/tickets/status', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  if (TICKET_STATUSES.indexOf(req.body.status) < 0) return res.status(400).json({ error: 'invalid status' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const prev = t.status;
  t.status = req.body.status;
  const now = new Date().toISOString();
  t.updatedAt = now;
  if (t.status === 'resolved') t.resolvedAt = now; else if (prev === 'resolved') t.resolvedAt = null;
  ticketHist(t, 'status', staff ? staff.name : 'Support', prev + ' → ' + t.status);
  const side = notifyRequester(t, 'ticket.replied', t.status === 'resolved' ? 'Ticket resolved' : 'Ticket updated', t.subject + ' · ' + t.status.replace('_', ' '));
  emit('ticket.updated', { ticket: t, source: t.source }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/tickets/status', `${t.id}: ${prev} → ${t.status}`, 'req', t.id),
    feedEntry('←', 'server', side, '', 'event: ticket.updated', `${side} notified`, 'evt', t.id)
  ]);
  res.json({ ticket: t });
});

// 6.16.2 — requester reopens (partner or client). Back into the queue.
app.post('/api/tickets/reopen', (req, res) => {
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  const actor = t.source === 'client' ? findClient(t.clientId) : findPartner(t.partnerId);
  const now = new Date().toISOString();
  t.status = 'reopened';
  t.resolvedAt = null;
  t.updatedAt = now;
  if (req.body.body) {
    t.thread.push({ by: t.requesterName, side: 'requester', at: now, kind: 'message', text: req.body.body });
  }
  ticketHist(t, 'reopened', actor ? actor.name : t.requesterName, req.body.body ? req.body.body.slice(0, 60) : 'reopened by requester');
  pushNote('admin', { kind: 'ticket.reopened', title: 'Ticket reopened', body: t.requesterName + ' · ' + t.subject, refId: t.id });
  emit('ticket.updated', { ticket: t, source: t.source }, [
    feedEntry('→', t.source, t.source, 'POST', '/api/tickets/reopen', `${t.requesterName} reopened ${t.id}`, 'req', t.id),
    feedEntry('←', 'server', 'admin', '', 'event: ticket.reopened', 'back in the support queue', 'evt', t.id)
  ]);
  res.json({ ticket: t });
});

// 6.16.2 — requester adds a message to their own ticket (partner P71 / client chat).
app.post('/api/tickets/message', (req, res) => {
  const t = db.tickets.find((x) => x.id === req.body.ticketId);
  if (!t) return res.status(404).json({ error: 'ticket not found' });
  const now = new Date().toISOString();
  t.thread.push({ by: t.requesterName, side: 'requester', at: now, kind: 'message', text: req.body.body || '' });
  if (t.status === 'resolved') { t.status = 'reopened'; t.resolvedAt = null; }
  t.updatedAt = now;
  ticketHist(t, 'message', t.requesterName, (req.body.body || '').slice(0, 60));
  pushNote('admin', { kind: 'ticket.created', title: t.source === 'client' ? 'Client message' : 'Partner message', body: t.requesterName + ' · ' + t.subject, refId: t.id });
  emit('ticket.updated', { ticket: t, source: t.source }, [
    feedEntry('→', t.source, t.source, 'POST', '/api/tickets/message', `${t.requesterName}: ${(req.body.body || '').slice(0, 40)}`, 'req', t.id),
    feedEntry('←', 'server', 'admin', '', 'event: ticket.updated', 'appears in the support console', 'evt', t.id)
  ]);
  res.json({ ticket: t });
});

// 6.16.1 / 6.16.5 — bulk assign / priority / status across selected tickets.
app.post('/api/tickets/bulk', (req, res) => {
  if (!requirePermission('ticket.reply', res)) return;
  const ids = Array.isArray(req.body.ticketIds) ? req.body.ticketIds : [];
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  let n = 0;
  ids.forEach((id) => {
    const t = db.tickets.find((x) => x.id === id);
    if (!t) return;
    if (req.body.assigneeId !== undefined) { const o = db.staff.find((s) => s.id === req.body.assigneeId); t.assigneeId = o ? o.id : null; t.assigneeName = o ? o.name : null; ticketHist(t, 'assigned', staff ? staff.name : 'Support', 'bulk → ' + (o ? o.name : 'unassigned')); }
    if (req.body.priority && TICKET_PRIORITIES.indexOf(req.body.priority) >= 0) { t.priority = req.body.priority; t.slaHours = SLA_HOURS[t.priority]; ticketHist(t, 'priority', staff ? staff.name : 'Support', 'bulk → ' + t.priority); }
    if (req.body.status && TICKET_STATUSES.indexOf(req.body.status) >= 0) { const prev = t.status; t.status = req.body.status; if (t.status === 'resolved') t.resolvedAt = now; ticketHist(t, 'status', staff ? staff.name : 'Support', 'bulk ' + prev + ' → ' + t.status); notifyRequester(t, 'ticket.replied', 'Ticket updated', t.subject + ' · ' + t.status.replace('_', ' ')); }
    t.updatedAt = now;
    n += 1;
  });
  emit('ticket.updated', { bulk: true, count: n }, [feedEntry('→', 'admin', 'admin', 'POST', '/api/tickets/bulk', `Bulk update on ${n} ticket(s)`, 'req')]);
  res.json({ updated: n });
});

// 6.16.3 — the client's ONE approved real-time channel. In-app: opens/continues
// a client ticket as a real thread. WhatsApp: returns an honest handoff link +
// a ticket STUB (no faked transcript). The configured channel is authoritative.
app.post('/api/chat/start', (req, res) => {
  const client = findClient(req.body.clientId || db.session.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  const channel = db.config.clientSupportChannel;
  // reuse an existing open chat ticket for this client if present
  let t = db.tickets.find((x) => x.source === 'client' && x.clientId === client.id && x.status !== 'resolved');
  if (!t) {
    const category = TICKET_CATEGORIES.indexOf(req.body.category) >= 0 ? req.body.category : 'Customer Care';
    const owner = assignStaffForCategory(category);
    db.seq.ticket += 1;
    const now = new Date().toISOString();
    t = {
      id: 'TKT-2024-' + String(db.seq.ticket).padStart(4, '0'),
      source: 'client', requesterId: client.id, requesterName: client.name,
      partnerId: null, partnerName: null, clientId: client.id, clientName: client.name,
      category: category, dept: category, subject: req.body.subject || 'Client chat',
      priority: 'normal', slaHours: SLA_HOURS.normal, status: 'open', channel: channel,
      assigneeId: owner ? owner.id : null, assigneeName: owner ? owner.name : null,
      createdAt: now, updatedAt: now, firstResponseAt: null, resolvedAt: null,
      attachments: [], thread: [], replies: [], body: '', history: []
    };
    if (channel === 'whatsapp') {
      t.thread.push({ by: 'System', side: 'system', at: now, kind: 'note', text: 'Conversation continues on WhatsApp Business — this stub tracks reference and status only. No transcript is stored in-app.' });
    }
    db.tickets.unshift(t);
    ticketHist(t, 'created', client.name, 'client · ' + channel + ' channel');
    pushNote('admin', { kind: 'ticket.created', title: 'Client chat started', body: client.name + ' · ' + channel, refId: t.id });
    emit('ticket.created', { ticket: t }, [
      feedEntry('→', 'client', 'client', 'POST', '/api/chat/start', `${client.name} started a ${channel === 'whatsapp' ? 'WhatsApp' : 'in-app'} chat`, 'req', t.id),
      feedEntry('←', 'server', 'admin', '', 'event: ticket.created', 'appears in the client chat console', 'evt', t.id)
    ]);
  }
  const waLink = channel === 'whatsapp' ? ('https://wa.me/' + String(db.config.whatsappNumber).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Salmon support — ref ' + t.id)) : null;
  res.status(201).json({ ticket: t, channel: channel, whatsappLink: waLink });
});

// FLOW 2 — sales kit doc access (quiet log) + cross-view construction publish
app.post('/api/docs/access', (req, res) => {
  const partner = findPartner(req.body.partnerId || db.session.partnerId);
  const project = findProject(req.body.projectId);
  db.seq.doc += 1;
  const entry = {
    id: 'DOC-' + String(db.seq.doc).padStart(4, '0'),
    partnerId: partner ? partner.id : null, partnerName: partner ? partner.name : 'Partner',
    projectId: req.body.projectId || null, projectName: project ? project.name : (req.body.projectName || '—'),
    docName: req.body.docName || 'Brochure.pdf', at: new Date().toISOString()
  };
  db.docAccessLog.unshift(entry);
  logAccess({ id: entry.id, name: entry.docName }, entry.partnerName, 'partner');
  emit('doc.accessed', { entry }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/docs/access', `${entry.partnerName} downloaded ${entry.docName}`, 'req', entry.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.accessed', `logged to document activity`, 'evt', entry.id)
  ]);
  res.json({ entry });
});

app.post('/api/construction/publish', (req, res) => {
  if (!requirePermission('construction.publish', res)) return;
  const project = findProject(req.body.projectId);
  if (!project) return res.status(404).json({ error: 'project not found' });
  db.constructionUpdates[project.id] = db.constructionUpdates[project.id] || [];
  const update = {
    id: 'CU-' + project.id.slice(-3) + '-' + Date.now(),
    date: new Date().toISOString(),
    stage: req.body.stage || 'New milestone',
    caption: req.body.caption || 'Construction update published.'
  };
  db.constructionUpdates[project.id].unshift(update);
  pushNote('partner', { kind: 'construction.published', title: 'New construction update', body: `${project.name} · ${update.stage}`, refId: update.id });
  emit('construction.published', { projectId: project.id, update }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/construction/publish', `Published update — ${project.name} · ${update.stage}`, 'req', update.id),
    feedEntry('←', 'server', 'partner', '', 'event: construction.published', `sales kit + client timeline both update`, 'evt', update.id),
    feedEntry('←', 'server', 'client', '', 'event: construction.published', `client construction timeline updates`, 'evt', update.id)
  ]);
  res.json({ update });
});

// Req 6.5/6.11 — Project & inventory catalogue management (create / publish /
// unpublish / inventory sync). Category is configurable per PRD.
const PROJECT_CATEGORIES = ['Apartment / Flat', 'Commercial space', 'Shop', 'Land / Plot share', 'Hospital / Hotel share'];
const UNIT_STATUSES = ['available', 'reserved', 'booked', 'sold'];

app.post('/api/projects', (req, res) => {
  if (!requirePermission('project.manage', res)) return;
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'project name required' });
  const category = PROJECT_CATEGORIES.indexOf(b.category) >= 0 ? b.category : PROJECT_CATEGORIES[0];
  db.seq.project = (db.seq.project || 0) + 1;
  const id = 'PRJ-' + String(db.seq.project).padStart(3, '0');
  const arr = (v) => Array.isArray(v) ? v : (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
  const num = (v) => Number(v) || 0;
  const areaFrom = num(b.areaFromSqft), areaTo = num(b.areaToSqft);
  const priceFrom = num(b.priceFromBdt), priceTo = num(b.priceToBdt);
  const areaLabel = areaFrom && areaTo ? (areaFrom + '–' + areaTo) : (areaFrom || areaTo || '—');
  const project = {
    id, name: b.name, category,
    location: b.location || '', status: b.status || 'upcoming', siteStatus: b.status === 'ongoing' ? 'Under construction' : b.status === 'completed' ? 'Ready' : 'Upcoming',
    tagline: b.summary || '', summary: b.summary || '',
    handover: b.handover || 'TBD',
    priceFromBdt: priceFrom, priceToBdt: priceTo, pricePlaceholder: !priceFrom,
    areaFromSqft: areaFrom, areaToSqft: areaTo,
    bedrooms: b.bedrooms || '', bathrooms: b.bathrooms || '', floors: b.floors || '',
    amenities: arr(b.amenities),
    contact: { phone: b.contactPhone || '09610-SALMON', visit: b.visit || 'By appointment · sales office' },
    glance: { buildingType: category, floors: b.floors || '—', unitSqft: areaLabel, bed: b.bedrooms || '—', bath: b.bathrooms || '—' },
    banner: b.banner || '', gallery: arr(b.gallery), units: [],
    media: {
      brochure: (b.brochure || b.brochureUrl) ? { name: b.brochure || 'Brochure.pdf', url: b.brochureUrl || '#', approved: true } : null,
      video: b.video ? { url: b.video, sample: false } : { url: SAMPLE_MEDIA.video, sample: true },
      tour360: b.tour360 ? { url: b.tour360, sample: false } : { url: SAMPLE_MEDIA.tour360, sample: true },
      floorPlan: b.floorPlanImg ? { url: b.floorPlanImg, schematic: false, sample: false, note: b.floorPlan || '' } : { schematic: true, sample: true, note: b.floorPlan || '' }
    },
    published: b.published !== false
  };
  normalizeDb({ projects: [project] }); // fill media/amenity/contact defaults
  db.projects.unshift(project);
  save();
  emit('project.created', { project }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/projects', `Created ${project.name} · ${category}`, 'req', project.id),
    feedEntry('←', 'server', 'partner', '', 'event: project.created', project.published ? 'published to sales kit' : 'saved as draft', 'evt', project.id)
  ]);
  res.status(201).json({ project });
});

app.post('/api/projects/publish', (req, res) => {
  if (!requirePermission('project.manage', res)) return;
  const project = findProject(req.body.projectId);
  if (!project) return res.status(404).json({ error: 'project not found' });
  project.published = req.body.published !== false;
  save();
  emit('project.updated', { project }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/projects/publish', `${project.published ? 'Published' : 'Unpublished'} ${project.name}`, 'req', project.id),
    feedEntry('←', 'server', 'partner', '', 'event: project.updated', project.published ? 'now visible to partners/clients' : 'hidden from partners/clients', 'evt', project.id)
  ]);
  res.json({ project });
});

app.post('/api/projects/inventory', (req, res) => {
  if (!requirePermission('project.manage', res)) return;
  const project = findProject(req.body.projectId);
  if (!project) return res.status(404).json({ error: 'project not found' });
  const unit = findUnit(project, req.body.unitNo);
  if (!unit) return res.status(404).json({ error: 'unit not found' });
  if (UNIT_STATUSES.indexOf(req.body.status) < 0) return res.status(400).json({ error: 'invalid status' });
  unit.status = req.body.status;
  save();
  emit('inventory.updated', { projectId: project.id, unitNo: unit.unitNo, status: unit.status }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/projects/inventory', `${project.name} · ${unit.unitNo} → ${unit.status}`, 'req', project.id),
    feedEntry('←', 'server', 'partner', '', 'event: inventory.updated', 'live inventory synced to mobile', 'evt', project.id)
  ]);
  res.json({ unit });
});

// Add a single inventory unit/share (or duplicate one — client sends a fresh
// unitNo with the source unit's fields). Synced live to the mobile apps.
app.post('/api/projects/unit', (req, res) => {
  if (!requirePermission('project.manage', res)) return;
  const project = findProject(req.body.projectId);
  if (!project) return res.status(404).json({ error: 'project not found' });
  project.units = project.units || [];
  const b = req.body;
  const unitNo = String(b.unitNo || '').trim();
  if (!unitNo) return res.status(400).json({ error: 'unit number required' });
  if (findUnit(project, unitNo)) return res.status(409).json({ error: 'unit ' + unitNo + ' already exists' });
  const unit = {
    unitNo, floor: b.floor != null ? b.floor : null, config: b.config || '',
    areaSqft: Number(b.areaSqft) || 0, priceBdt: Number(b.priceBdt) || 0,
    orientation: b.orientation || '',
    status: UNIT_STATUSES.indexOf(b.status) >= 0 ? b.status : 'available'
  };
  project.units.push(unit);
  save();
  emit('inventory.updated', { projectId: project.id, unitNo: unit.unitNo, status: unit.status }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/projects/unit', `${project.name} · added ${unit.unitNo}`, 'req', project.id),
    feedEntry('←', 'server', 'partner', '', 'event: inventory.updated', 'new unit synced to mobile', 'evt', project.id)
  ]);
  res.status(201).json({ unit });
});

// ===========================================================================
// LEGAL / FINANCE / MANAGER role completions
// ===========================================================================

// L1 — reject KYC with a reason (verbatim to the client)
app.post('/api/kyc/reject', (req, res) => {
  if (!requirePermission('kyc.reject', res)) return;
  const client = findClient(req.body.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  client.kycStatus = 'rejected';
  client.kycReason = req.body.reason || 'Document could not be verified.';
  pushNote('client', { kind: 'kyc.rejected', title: 'KYC could not be verified', body: client.kycReason, refId: client.id });
  emit('kyc.rejected', { clientId: client.id, client, reason: client.kycReason }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/kyc/reject', `KYC rejected for ${client.name}`, 'req', client.id),
    feedEntry('←', 'server', 'client', '', 'event: kyc.rejected', 'reason delivered verbatim to phone', 'evt', client.id)
  ]);
  res.json({ client });
});

// F2 — verify an international wire (receipt confirmed offline) → booking confirms
app.post('/api/wires/verify', (req, res) => {
  if (!requirePermission('wire.verify', res)) return;
  const wire = (db.wires || []).find((w) => w.id === req.body.wireId);
  if (!wire) return res.status(404).json({ error: 'wire not found' });
  wire.status = 'verified';
  wire.verifiedAt = new Date().toISOString();
  const booking = findBooking(wire.bookingId);
  if (booking && booking.status !== 'confirmed') {
    booking.status = 'confirmed';
    booking.confirmedAt = new Date().toISOString();
    const project = findProject(booking.projectId);
    const unit = findUnit(project, booking.unitNo);
    if (unit) unit.status = 'booked';
    const client = findClient(booking.clientId);
    if (client) {
      if (!client.bookings.includes(booking.id)) client.bookings.push(booking.id);
      db.seq.ledger += 1;
      client.ledger = client.ledger || [];
      client.ledger.unshift({ id: 'LG-' + db.seq.ledger, ts: booking.confirmedAt, desc: `Booking token (wire) — ${booking.projectName} ${booking.unitNo}`, debitBdt: 0, creditBdt: booking.amountBdt, method: 'Bank Wire', status: 'verified', ref: wire.reference });
      if (!client.schedule || client.schedule.length === 0) { client.schedule = buildSchedule(client.id); client.scheduleProjectName = booking.projectName; client.scheduleUnitNo = booking.unitNo; }
      pushNote('client', { kind: 'booking.confirmed', title: 'Booking confirmed', body: `${booking.unitNo} · ${booking.id}`, refId: booking.id });
    }
  }
  emit('wire.verified', { wireId: wire.id, wire, bookingId: wire.bookingId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/wires/verify', `Wire ${wire.reference} verified — ${wire.clientName}`, 'req', wire.id),
    feedEntry('←', 'server', 'client', '', 'event: wire.verified', 'booking confirms on the client side', 'evt', wire.bookingId || wire.id)
  ]);
  res.json({ wire });
});

// F7 — generate an invoice PDF stub → appears on the client's list (as a notification)
app.post('/api/invoices/generate', (req, res) => {
  if (!requirePermission('invoice.generate', res)) return;
  const client = findClient(req.body.clientId);
  if (!client) return res.status(404).json({ error: 'client not found' });
  db.seq.invoice += 1;
  const inv = { id: 'INV-2024-' + String(db.seq.invoice).padStart(4, '0'), clientId: client.id, clientName: client.name, bookingId: req.body.bookingId || null, amountBdt: req.body.amountBdt || 50000, createdAt: new Date().toISOString(), url: '#invoice-stub' };
  db.invoices = db.invoices || [];
  db.invoices.unshift(inv);
  pushNote('client', { kind: 'invoice.generated', title: 'New invoice available', body: `${inv.id} · ${bdt(inv.amountBdt)}`, refId: inv.id });
  emit('invoice.generated', { invoice: inv, clientId: client.id }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/invoices/generate', `Invoice ${inv.id} generated — ${client.name}`, 'req', inv.id),
    feedEntry('←', 'server', 'client', '', 'event: invoice.generated', 'invoice appears on the client', 'evt', inv.id)
  ]);
  res.json({ invoice: inv });
});

// M5 — confirm a client-requested consultation slot
app.post('/api/consultations/confirm', (req, res) => {
  if (!requirePermission('consultation.confirm', res)) return;
  const c = (db.consultations || []).find((x) => x.id === req.body.consultationId);
  if (!c) return res.status(404).json({ error: 'consultation not found' });
  c.status = 'confirmed';
  c.link = req.body.link || 'https://meet.google.com/salmon-' + c.id.toLowerCase();
  c.slot = req.body.slot || c.slot;
  pushNote('client', { kind: 'consultation.confirmed', title: 'Consultation confirmed', body: `${c.topic} · ${c.slot}`, refId: c.id });
  emit('consultation.confirmed', { consultationId: c.id, consultation: c, clientId: c.clientId }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/consultations/confirm', `Confirmed consultation for ${c.clientName}`, 'req', c.id),
    feedEntry('←', 'server', 'client', '', 'event: consultation.confirmed', 'client notified with a meeting link', 'evt', c.id)
  ]);
  res.json({ consultation: c });
});

// ===========================================================================
// Req 6.7 — Secure Document Repository endpoints.
// Upload runs the safety pipeline; every upload/classify/verify/version/
// publish/archive/delete is audited; file bytes are reachable ONLY through the
// signed-link flow below (there is no static document path anywhere).
// ===========================================================================

// 6.7.1 / 6.7.2 / 6.7.3 / 6.7.7 — upload with type/size validation + scan queue.
app.post('/api/documents/upload', (req, res) => {
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  if (!staff) return res.status(401).json({ error: 'not signed in' });
  const dt = findDocType(req.body.docType);
  if (!dt) return res.status(400).json({ error: 'unknown document type — pick one from the registry' });
  // Upload authorisation is per-type (6.7.1/6.7.2), derived from the registry.
  if (staff.role !== 'Super Admin' && dt.uploaderRoles.indexOf(staff.role) < 0) {
    return res.status(403).json({ error: staff.role + ' is not authorised to upload ' + dt.label });
  }
  const name = req.body.name || 'Untitled';
  const ext = name.split('.').pop().toLowerCase();
  if (dt.allowedExt.indexOf(ext) < 0) {
    return res.status(400).json({ error: '.' + ext + ' not allowed for ' + dt.label + ' (allowed: ' + dt.allowedExt.join(', ') + ')' });
  }
  const sizeKb = Number(req.body.sizeKb) || 512;
  if (sizeKb > dt.maxSizeKb) {
    return res.status(400).json({ error: name + ' is ' + sizeKb + 'KB — exceeds the ' + dt.maxSizeKb + 'KB limit for ' + dt.label });
  }
  const link = resolveLinkage(req.body);
  db.seq.repo += 1;
  const now = new Date().toISOString();
  // Classification: explicit if provided + valid, else the registry default.
  const cls = (req.body.classification && DOC_CLASSIFICATIONS.indexOf(req.body.classification) >= 0)
    ? req.body.classification : dt.defaultClassification;
  const doc = {
    id: 'DOC-REP-' + db.seq.repo, name: name, docType: dt.code, family: dt.family,
    classification: cls, classifiedAt: now,
    documentableType: link.type, documentableId: link.id, documentableLabel: link.label,
    projectId: link.type === 'project' ? link.id : (req.body.projectId || null),
    projectName: link.type === 'project' ? link.label : (findProject(req.body.projectId) ? findProject(req.body.projectId).name : 'All projects'),
    customerId: link.type === 'customer' ? link.id : (req.body.customerId || null),
    leadId: link.type === 'lead' ? link.id : (req.body.leadId || null),
    storageKey: 's3://salmon-secure-docs/DOC-REP-' + db.seq.repo + '/' + encodeURIComponent(name),
    mime: extMime(ext), sizeKb: sizeKb,
    scanStatus: 'scanning', lifecycleStatus: 'active', verificationStatus: 'uploaded',
    version: 1, isCurrent: true, supersedesId: null, supersededById: null,
    publishedToPartner: cls === 'partnerVisible' ? !!req.body.publishToPartner : false, publishedPartnerIds: null,
    sharedToAllClients: !!req.body.sharedToAllClients,
    verifiedBy: null, verifiedByRole: null, verifiedAt: null,
    uploadedBy: staff.name, uploadedByRole: staff.role, uploadedAt: now,
    retentionUntil: null, archivedAt: null, deletedBy: null, deletedAt: null, deleteReason: null,
    history: [{ action: 'uploaded', by: staff.name, role: staff.role, at: now, note: 'Uploaded — queued for malware scan' }]
  };
  doc.retentionUntil = computeRetention(doc);
  db.documents.unshift(doc);
  logAccess(doc, staff.name, 'staff', 'upload');
  emit('doc.uploaded', { document: doc }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/upload', `Uploaded ${doc.name} → ${CLASSIFICATION_LABEL[cls]}`, 'req', doc.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.uploaded', `stored in private bucket · scanning before it becomes accessible`, 'evt', doc.id)
  ]);
  scanDocument(doc.id); // async safety pipeline — file stays unreachable until clean
  res.status(201).json({ document: doc });
});

// 6.7.4 — (re)classify. Classification is the access lever; default-deny holds.
app.post('/api/documents/classify', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  if (DOC_CLASSIFICATIONS.indexOf(req.body.classification) < 0) return res.status(400).json({ error: 'invalid classification' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const prev = doc.classification;
  doc.classification = req.body.classification;
  doc.classifiedAt = new Date().toISOString();
  // Leaving partnerVisible un-publishes; a customer doc is never partner-visible.
  if (doc.classification !== 'partnerVisible') doc.publishedToPartner = false;
  if (doc.classification !== 'customerLeadRestricted') doc.sharedToAllClients = false;
  doc.history.push({ action: 'reclassified', by: staff ? staff.name : 'Legal', role: staff ? staff.role : null, at: doc.classifiedAt, note: CLASSIFICATION_LABEL[prev] + ' → ' + CLASSIFICATION_LABEL[doc.classification] });
  logAccess(doc, staff ? staff.name : 'Legal', 'staff', 'reclassify');
  emit('doc.classified', { document: doc }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/classify', `${doc.name}: ${CLASSIFICATION_LABEL[prev]} → ${CLASSIFICATION_LABEL[doc.classification]}`, 'req', doc.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.classified', 'access recomputed for all surfaces', 'evt', doc.id)
  ]);
  res.json({ document: doc });
});

// 6.7.10 — publish (partner summary) or share-to-all-clients (general collateral).
app.post('/api/documents/publish', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  let side = null, note = '';
  if (req.body.audience === 'partner') {
    if (doc.classification !== 'partnerVisible') return res.status(400).json({ error: 'only partner-visible documents can be published to partners — reclassify first' });
    if (doc.family === 'customer') return res.status(400).json({ error: 'customer documents are never published to partners' });
    doc.publishedToPartner = req.body.publish !== false;
    side = doc.publishedToPartner ? 'partner' : null;
    note = doc.publishedToPartner ? 'Published legal summary to partners' : 'Withdrawn from partners';
  } else if (req.body.audience === 'allClients') {
    if (doc.classification !== 'customerLeadRestricted') return res.status(400).json({ error: 'only customer-restricted collateral can be shared to all clients' });
    doc.sharedToAllClients = req.body.publish !== false;
    side = doc.sharedToAllClients ? 'client' : null;
    note = doc.sharedToAllClients ? 'Shared general collateral to all clients' : 'Withdrawn from clients';
  } else {
    return res.status(400).json({ error: 'audience must be partner or allClients' });
  }
  doc.history.push({ action: 'publish', by: staff ? staff.name : 'Legal', role: staff ? staff.role : null, at: now, note: note });
  logAccess(doc, staff ? staff.name : 'Legal', 'staff', 'publish');
  if (side) pushNote(side, { kind: 'doc.shared', title: 'New document available', body: doc.name, refId: doc.id });
  const arrows = [feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/publish', `${doc.name}: ${note}`, 'req', doc.id)];
  if (side) arrows.push(feedEntry('←', 'server', side, '', 'event: doc.published', side + ' sees it appear', 'evt', doc.id));
  emit('doc.published', { document: doc, side: side }, arrows);
  res.json({ document: doc });
});

// 6.7.8 / 6.7.11 — verification is a HUMAN legal-team decision, attributed to
// the officer who took it. The system records the status; it does NOT validate
// the deed's legal authenticity and does NOT process registration.
app.post('/api/documents/verify', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  const status = req.body.status;
  if (['underReview', 'verified', 'rejected'].indexOf(status) < 0) return res.status(400).json({ error: 'status must be underReview | verified | rejected' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  doc.verificationStatus = status;
  doc.verifiedBy = staff ? staff.name : 'Legal officer';
  doc.verifiedByRole = staff ? staff.role : 'Legal / Document Controller';
  doc.verifiedAt = now;
  doc.history.push({ action: 'verify', by: doc.verifiedBy, role: doc.verifiedByRole, at: now, note: 'Marked ' + status + ' by a Salmon legal officer (records a human decision — not automated legal validation)' });
  logAccess(doc, doc.verifiedBy, 'staff', 'verify');
  emit('doc.verified', { document: doc }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/verify', `${doc.name} marked ${status} by ${doc.verifiedBy}`, 'req', doc.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.verified', 'human decision recorded (not a system determination)', 'evt', doc.id)
  ]);
  res.json({ document: doc });
});

// 6.7.8 — new version supersedes the old. The old is RETAINED (not deleted)
// and marked superseded; the current version is what users see.
app.post('/api/documents/version', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const old = db.documents.find((d) => d.id === req.body.docId);
  if (!old) return res.status(404).json({ error: 'document not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const name = req.body.name || old.name;
  const dt = findDocType(old.docType);
  const ext = name.split('.').pop().toLowerCase();
  if (dt && dt.allowedExt.indexOf(ext) < 0) return res.status(400).json({ error: '.' + ext + ' not allowed for ' + dt.label });
  const now = new Date().toISOString();
  db.seq.repo += 1;
  const next = Object.assign({}, old, {
    id: 'DOC-REP-' + db.seq.repo, name: name, sizeKb: Number(req.body.sizeKb) || old.sizeKb,
    storageKey: 's3://salmon-secure-docs/DOC-REP-' + db.seq.repo + '/' + encodeURIComponent(name),
    version: old.version + 1, isCurrent: true, supersedesId: old.id, supersededById: null,
    scanStatus: 'scanning', verificationStatus: 'uploaded', verifiedBy: null, verifiedByRole: null, verifiedAt: null,
    uploadedBy: staff ? staff.name : 'Legal', uploadedByRole: staff ? staff.role : null, uploadedAt: now,
    history: [{ action: 'uploaded', by: staff ? staff.name : 'Legal', role: staff ? staff.role : null, at: now, note: 'Version ' + (old.version + 1) + ' — supersedes ' + old.id + ', queued for scan' }]
  });
  next.retentionUntil = computeRetention(next);
  old.isCurrent = false;
  old.supersededById = next.id;
  old.verificationStatus = 'superseded';
  old.history.push({ action: 'superseded', by: staff ? staff.name : 'Legal', role: staff ? staff.role : null, at: now, note: 'Superseded by ' + next.id + ' (v' + next.version + ') — retained, no longer shown as current' });
  db.documents.unshift(next);
  logAccess(next, staff ? staff.name : 'Legal', 'staff', 'version');
  scanDocument(next.id);
  emit('doc.versioned', { document: next, previous: old }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/version', `${name} v${next.version} supersedes v${old.version} (old retained)`, 'req', next.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.versioned', 'prior version kept in history, not current', 'evt', next.id)
  ]);
  res.status(201).json({ document: next, previous: old });
});

// 6.7.9 — archive (out of active view, not deleted).
app.post('/api/documents/archive', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  const archiving = req.body.archive !== false;
  doc.lifecycleStatus = archiving ? 'archived' : 'active';
  doc.archivedAt = archiving ? now : null;
  doc.history.push({ action: archiving ? 'archived' : 'unarchived', by: staff ? staff.name : 'Legal', role: staff ? staff.role : null, at: now, note: archiving ? 'Moved to archive — retained, out of active view' : 'Restored to active repository' });
  logAccess(doc, staff ? staff.name : 'Legal', 'staff', archiving ? 'archive' : 'unarchive');
  emit('doc.archived', { document: doc }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/archive', `${doc.name} ${archiving ? 'archived' : 'restored'}`, 'req', doc.id)
  ]);
  res.json({ document: doc });
});

// 6.7.9 — soft-delete ONLY. The record + audit trail are retained; never hard-deleted.
app.post('/api/documents/delete', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  const now = new Date().toISOString();
  doc.lifecycleStatus = 'deleted';
  doc.isCurrent = false;
  doc.publishedToPartner = false;
  doc.sharedToAllClients = false;
  doc.deletedBy = staff ? staff.name : 'Legal';
  doc.deletedByRole = staff ? staff.role : null;
  doc.deletedAt = now;
  doc.deleteReason = req.body.reason || 'No reason given';
  doc.history.push({ action: 'deleted', by: doc.deletedBy, role: doc.deletedByRole, at: now, note: 'Soft-deleted — reason: ' + doc.deleteReason + ' (record + audit trail retained, never hard-deleted)' });
  logAccess(doc, doc.deletedBy, 'staff', 'delete');
  emit('doc.deleted', { document: doc }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/delete', `${doc.name} soft-deleted — ${doc.deleteReason}`, 'req', doc.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.deleted', 'file unreachable, audit trail kept', 'evt', doc.id)
  ]);
  res.json({ document: doc });
});

// 6.7.9 — configurable retention per document type (updates the registry).
app.post('/api/documents/retention', (req, res) => {
  if (!requirePermission('doc.manage', res)) return;
  const dt = findDocType(req.body.docType);
  if (!dt) return res.status(404).json({ error: 'unknown document type' });
  const years = Number(req.body.retentionYears);
  if (!(years > 0)) return res.status(400).json({ error: 'retentionYears must be a positive number' });
  dt.retentionYears = years;
  // recompute retention for existing docs of this type
  (db.documents || []).forEach((d) => { if (d.docType === dt.code) d.retentionUntil = computeRetention(d); });
  emit('doc.retention', { docType: dt.code, retentionYears: years }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/documents/retention', `Retention for ${dt.label} set to ${years} year(s)`, 'req', dt.code)
  ]);
  res.json({ docType: dt });
});

// 6.7.5 / 6.7.6 — request a time-limited signed link. Issued ONLY after
// canAccessDocument passes; the view/download itself is audited here.
app.post('/api/documents/access', (req, res) => {
  const actor = resolveDocActor(req.body);
  if (!actor) return res.status(401).json({ error: 'no actor' });
  const doc = db.documents.find((d) => d.id === req.body.docId);
  if (!doc) return res.status(404).json({ error: 'document not found' });
  const verdict = canAccessDocument(actor, doc);
  if (!verdict.ok) {
    // Denied attempts are audited too — compliance wants the whole picture.
    logAccess(doc, actor.label, actor.kind, 'denied');
    emit('doc.denied', { docId: doc.id, actor: actor.label, reason: verdict.reason }, [
      feedEntry('→', feedSideFor(actor), feedSideFor(actor), 'POST', '/api/documents/access', `${actor.label} tried to open ${doc.name} — DENIED (${verdict.reason})`, 'req', doc.id),
      feedEntry('←', 'server', 'admin', '', 'event: doc.denied', 'denied attempt written to access log', 'evt', doc.id)
    ]);
    return res.status(403).json({ error: verdict.reason });
  }
  const purpose = req.body.purpose === 'download' ? 'download' : 'view';
  const signed = issueSignedUrl(doc, actor, purpose);
  logAccess(doc, actor.label, actor.kind, purpose);
  emit('doc.accessed', { docId: doc.id, actor: actor.label, purpose: purpose }, [
    feedEntry('→', feedSideFor(actor), feedSideFor(actor), 'POST', '/api/documents/access', `${actor.label} opened ${doc.name} — signed link issued (${signed.ttlSec}s TTL)`, 'req', doc.id),
    feedEntry('←', 'server', 'admin', '', 'event: doc.accessed', `access logged — who · when · ${purpose}`, 'evt', doc.id)
  ]);
  res.json({ url: signed.url, expiresAt: signed.expiresAt, ttlSec: signed.ttlSec, document: doc });
});

// 6.7.5 / 6.7.6 — the ONLY path that serves a document's bytes. Validates the
// signed token, re-checks access at delivery time, then streams (mock). There
// is NO permanent public URL: grep the codebase — no document is statically served.
app.get('/api/documents/file/:token', (req, res) => {
  const t = db.signedTokens[req.params.token];
  if (!t) return res.status(404).type('text/plain').send('Invalid link. Documents are never served from a permanent URL — request a fresh signed link.');
  if (Date.now() > t.expiresAt) { delete db.signedTokens[req.params.token]; return res.status(410).type('text/plain').send('This signed link has expired. Signed links are time-limited by design — request a new one.'); }
  const doc = db.documents.find((d) => d.id === t.docId);
  if (!doc) return res.status(404).type('text/plain').send('Document not found.');
  const verdict = canAccessDocument(tokenActor(t), doc); // defence in depth
  if (!verdict.ok) return res.status(403).type('text/plain').send('Access denied: ' + verdict.reason);
  t.usedAt = Date.now();
  res.set('Cache-Control', 'no-store');
  res.type('text/html').send(mockDocFilePage(doc, t));
});

// ===========================================================================
// TASKS & TARGETS module.  Assignment (Manager/Team Lead) → execution
// (Partner) → review (Team Lead/Manager/Admin). Targets are DERIVED, never typed.
// ===========================================================================
function findTask(id) { return db.tasks.find((t) => t.id === id); }
function endOfToday() { const d = new Date(); d.setHours(18, 0, 0, 0); return d.toISOString(); }

// POST /api/tasks — create/assign (staff Manager/Super, or Team-Lead from mobile)
app.post('/api/tasks', (req, res) => {
  const b = req.body || {};
  const teamLead = b.assignerType === 'teamlead';
  let assignerName, assignerRole, assignerType, terr = null;
  if (teamLead) {
    const lead = findPartner(b.teamLeadId || db.session.partnerId);
    if (!lead || !lead.teamLead) return res.status(403).json({ error: 'not a team lead' });
    assignerName = lead.name; assignerRole = 'Team Lead'; assignerType = 'teamlead'; terr = lead.territory;
    // scope: assignees must be within the lead's own team
    const teamIds = (lead.team || []).map((m) => m.id);
    const ids0 = (b.assigneeIds && b.assigneeIds.length) ? b.assigneeIds : [b.assigneePartnerId];
    if (ids0.some((id) => teamIds.indexOf(id) < 0)) return res.status(403).json({ error: 'partner not in your team' });
  } else {
    if (!requirePermission('task.create', res)) return;
    const staff = db.staff.find((s) => s.id === db.session.staffId);
    assignerName = staff.name; assignerRole = staff.role; assignerType = 'staff';
  }
  const ids = (b.assigneeIds && b.assigneeIds.length) ? b.assigneeIds : [b.assigneePartnerId];
  const created = [];
  ids.forEach((pid) => {
    const p = findPartner(pid);
    if (!p) return;
    db.seq.task += 1;
    const t = {
      id: 'TSK-2024-' + db.seq.task, title: b.title || 'Task', description: b.description || '',
      assigneePartnerId: p.id, assigneePartnerName: p.name,
      assignedBy: assignerName, assignedByRole: assignerRole, assignerType: assignerType,
      territory: terr || p.territory, dueDate: b.dueDate || endOfToday(),
      evidenceRequired: !!b.evidenceRequired, status: 'assigned',
      createdAt: new Date().toISOString(), completedAt: null, completionNote: null, evidenceFile: null
    };
    db.tasks.unshift(t);
    created.push(t);
    pushNote('partner', { kind: 'task.assigned', title: 'New task from ' + assignerName + (teamLead ? ' (Team Lead)' : ' (' + roleShort(assignerRole) + ')'), body: t.title, refId: t.id, pid: t.assigneePartnerId });
  });
  if (!created.length) return res.status(404).json({ error: 'no valid assignees' });
  const first = created[0];
  const label = created.length > 1 ? ('assigned ' + created.length + ' partners a task') : ('assigned a task — ' + first.title);
  emit('task.assigned', { tasks: created, count: created.length }, [
    feedEntry('→', teamLead ? 'partner' : 'admin', teamLead ? 'partner' : 'admin', 'POST', '/api/tasks', (teamLead ? assignerName + ' ' : '') + label, 'req', first.id),
    feedEntry('←', 'server', 'partner', '', 'event: task.assigned', created.length > 1 ? (created.length + ' partners notified') : (first.assigneePartnerName + ' notified'), 'evt', first.id)
  ]);
  res.status(201).json({ tasks: created });
});

// POST /api/tasks/complete — partner completes their OWN task only
app.post('/api/tasks/complete', (req, res) => {
  const t = findTask(req.body.taskId);
  if (!t) return res.status(404).json({ error: 'task not found' });
  if (db.session.partnerId !== t.assigneePartnerId) return res.status(403).json({ error: 'forbidden — not your task' });
  if (t.status === 'cancelled') return res.status(409).json({ error: 'task cancelled' });
  if (t.evidenceRequired && !req.body.evidenceFile) return res.status(400).json({ error: 'evidence required for this task' });
  t.status = 'complete';
  t.completedAt = new Date().toISOString();
  t.completionNote = req.body.note || '';
  if (req.body.evidenceFile) t.evidenceFile = req.body.evidenceFile;
  pushNote('admin', { kind: 'task.completed', title: 'Task completed', body: t.assigneePartnerName + ' · ' + t.title, refId: t.id });
  emit('task.completed', { taskId: t.id, task: t }, [
    feedEntry('→', 'partner', 'partner', 'POST', '/api/tasks/complete', t.assigneePartnerName + ' completed — ' + t.title, 'req', t.id),
    feedEntry('←', 'server', 'admin', '', 'event: task.completed', 'assignor sees the note + evidence', 'evt', t.id)
  ]);
  res.json({ task: t });
});

// POST /api/tasks/cancel — staff (Manager/Super) or the team-lead who created it
app.post('/api/tasks/cancel', (req, res) => {
  const t = findTask(req.body.taskId);
  if (!t) return res.status(404).json({ error: 'task not found' });
  if (t.assignerType === 'teamlead') {
    const lead = findPartner(db.session.partnerId);
    if (!lead || !lead.teamLead || t.assignedBy !== lead.name) {
      if (!requirePermission('task.cancel', res)) return;
    }
  } else {
    if (!requirePermission('task.cancel', res)) return;
  }
  t.status = 'cancelled';
  t.cancelledAt = new Date().toISOString();
  pushNote('partner', { kind: 'task.cancelled', title: 'Task cancelled', body: t.title, refId: t.id, pid: t.assigneePartnerId });
  emit('task.cancelled', { taskId: t.id, task: t }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/tasks/cancel', 'Cancelled task — ' + t.title, 'req', t.id),
    feedEntry('←', 'server', 'partner', '', 'event: task.cancelled', t.assigneePartnerName + ' sees it removed', 'evt', t.id)
  ]);
  res.json({ task: t });
});

// POST /api/tasks/status — board status change (Manager/Super). The ClickUp
// drag / one-tap move. Between assigned ↔ in_progress ↔ complete. 'overdue' is
// NEVER set by hand — only the server tick flips it. Completing an
// evidence-required task stays a PARTNER action (clause 3) — refused here.
app.post('/api/tasks/status', (req, res) => {
  if (!requirePermission('task.create', res)) return; // Manager/Super run the board
  const t = findTask(req.body.taskId);
  if (!t) return res.status(404).json({ error: 'task not found' });
  if (t.status === 'cancelled') return res.status(409).json({ error: 'task cancelled' });
  const to = req.body.status;
  if (['assigned', 'in_progress', 'complete'].indexOf(to) < 0) return res.status(400).json({ error: 'cannot move to ' + to });
  if (to === 'complete' && t.evidenceRequired && !t.evidenceFile) {
    return res.status(409).json({ error: 'evidence required — the partner completes this task' });
  }
  const from = t.status;
  if (from === to) return res.json({ task: t });
  const staff = db.staff.find((s) => s.id === db.session.staffId);
  t.status = to;
  if (to === 'complete') {
    t.completedAt = new Date().toISOString();
    if (!t.completionNote) t.completionNote = 'Marked complete by ' + (staff ? staff.name : 'staff');
  } else {
    // moving back out of complete clears the completion stamp (record stays)
    if (from === 'complete') { t.completedAt = null; }
  }
  if (to === 'complete') pushNote('partner', { kind: 'task.status', title: 'Task marked complete', body: t.title, refId: t.id, pid: t.assigneePartnerId });
  emit('task.status', { taskId: t.id, task: t, from: from, to: to }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/tasks/status', 'Moved “' + t.title + '” ' + from + ' → ' + to, 'req', t.id),
    feedEntry('←', 'server', 'partner', '', 'event: task.status', 'board card moves; counts update', 'evt', t.id)
  ]);
  res.json({ task: t });
});

// POST /api/targets — set/adjust a target (Manager/Super). Achievement is NEVER set here.
app.post('/api/targets', (req, res) => {
  if (!requirePermission('target.set', res)) return;
  const b = req.body || {};
  let tgt = b.targetId ? db.targets.find((x) => x.id === b.targetId) : null;
  if (tgt) {
    tgt.targetValue = Number(b.targetValue) || tgt.targetValue;
    tgt.updatedAt = new Date().toISOString();
  } else {
    db.seq.target += 1;
    tgt = {
      id: 'TGT-2024-' + String(db.seq.target).padStart(2, '0'),
      scope: b.scope || 'partner', partnerId: b.partnerId || null, partnerName: b.partnerName || null,
      teamLeadId: b.teamLeadId || null, teamName: b.teamName || null, territory: b.territory || null,
      metric: 'converted_leads', period: b.period || db.meta.currentPeriod,
      targetValue: Number(b.targetValue) || 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archivedAchievement: null
    };
    db.targets.push(tgt);
  }
  const who = tgt.scope === 'team' ? (tgt.teamName || 'team') : (tgt.partnerName || 'partner');
  if (tgt.partnerId) pushNote('partner', { kind: 'target.updated', title: 'Target updated', body: who + ' · ' + tgt.targetValue + ' converted leads (' + tgt.period + ')', refId: tgt.id, pid: tgt.partnerId });
  emit('target.updated', { target: tgt }, [
    feedEntry('→', 'admin', 'admin', 'POST', '/api/targets', 'Set target — ' + who + ' · ' + tgt.targetValue, 'req', tgt.id),
    feedEntry('←', 'server', 'partner', '', 'event: target.updated', 'partner target recomputes', 'evt', tgt.id)
  ]);
  res.json({ target: tgt });
});

// ---------------------------------------------------------------------------
// Overdue sweeper — a task past its due date auto-flips to Overdue, no actor.
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  let changed = false;
  (db.tasks || []).forEach((t) => {
    if ((t.status === 'assigned' || t.status === 'in_progress') && new Date(t.dueDate).getTime() < now) {
      t.status = 'overdue';
      changed = true;
      emit('task.overdue', { taskId: t.id, task: t }, [
        feedEntry('←', 'server', 'partner', '', 'event: task.overdue', t.assigneePartnerName + ' — ' + t.title + ' is overdue', 'evt', t.id),
        feedEntry('←', 'server', 'admin', '', 'event: task.overdue', 'appears in the missed-activities queue', 'evt', t.id)
      ]);
    }
  });
  if (changed) save();
}, 5000);

// ---------------------------------------------------------------------------
// SSE endpoint — the live connection.
// ---------------------------------------------------------------------------
app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');
  sseSend(res, { type: 'hello', ts: Date.now(), data: { connected: true }, feed: [] });
  sseClients.add(res);
  console.log(`  ↳ SSE  client connected (${sseClients.size} live)`);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
    console.log(`  ↳ SSE  client disconnected (${sseClients.size} live)`);
  });
});

// ---------------------------------------------------------------------------
// Lock-expiry sweeper — the countdown is REAL. If a locked booking is neither
// confirmed nor superseded before its window closes, release it honestly.
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  let changed = false;
  db.bookings.forEach((b) => {
    // Only expire while the CLIENT still owes the token. Once a payment webhook
    // has landed (awaiting_confirmation), the unit is soft-held for admin
    // reconciliation — an already-paid unit must never be released by the clock.
    if (b.status === 'pending_payment' && now > b.lockExpiresAt) {
      b.status = 'expired';
      const project = findProject(b.projectId);
      const unit = findUnit(project, b.unitNo);
      if (unit && unit.status === 'locked') unit.status = 'available';
      const wh = db.webhooks.find((w) => w.bookingId === b.id && w.status === 'pending');
      if (wh) wh.status = 'expired';
      changed = true;
      pushNote('client', { kind: 'booking.expired', title: 'Lock expired', body: `${b.unitNo} released — booking not confirmed in time`, refId: b.id });
      emit('booking.expired', { bookingId: b.id, booking: b, projectId: b.projectId }, [
        feedEntry('←', 'server', 'client', '', 'event: booking.expired', `${b.unitNo} lock expired — unit released`, 'evt', b.id),
        feedEntry('←', 'server', 'admin', '', 'event: unit.released', `${b.unitNo} back to available`, 'evt', b.id)
      ]);
    }
  });
  if (changed) save();
}, 1000);

// ---------------------------------------------------------------------------
// Static frontends
// ---------------------------------------------------------------------------
app.use(express.static(path.join(ROOT, 'public')));
app.get('/client', (req, res) => res.sendFile(path.join(ROOT, 'public', 'client', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'public', 'admin', 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║   Salmon Live Demo — one store, two views            ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log(`  Split view : http://localhost:${PORT}`);
  console.log(`  Client only: http://localhost:${PORT}/client`);
  console.log(`  Admin only : http://localhost:${PORT}/admin`);
  console.log(`  API        : http://localhost:${PORT}/api/state`);
  console.log(`  SSE        : http://localhost:${PORT}/api/events`);
  console.log('  Data file  : data.json  (reset via the top-bar button)');
  console.log('');
  console.log('  Requests below are live — point the client at this terminal');
  console.log('  when they ask "is this really connected?"');
  console.log('');
});
