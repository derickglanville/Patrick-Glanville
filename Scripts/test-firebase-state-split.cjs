const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('app.js', 'utf8');
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.notEqual(start, -1, `missing ${name}`);
  const rest = source.slice(start);
  const end = rest.slice(1).search(/\n(?:async )?function /);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

const archives = new Map();
const state = {
  tasks: [], bills: [{ name: 'Card', currentBalance: 100 }],
  billSnapshots: Array.from({ length: 18 }, (_, index) => ({ month: `2026-${index}`, notes: 'x'.repeat(35) })),
  billAuditLog: [{ action: 'saved' }, { action: 'updated' }],
  history: [{ date: '2026-10-01', value: 100 }]
};
const c = {
  structuredClone, JSON, TextEncoder, Promise, Array, Object, Number,
  activeClientId: 'admin', state, DEVICE_SESSION_ID: 'test-session',
  SUPABASE_TABLE: 'tracker_state', FIREBASE_ARCHIVE_SUBCOLLECTION: 'archives',
  FIREBASE_ARCHIVE_FIELDS: ['billSnapshots', 'billAuditLog', 'history'],
  FIREBASE_ARCHIVE_CHUNK_MAX_BYTES: 160,
  getSupabaseStateId: () => 'admin-glanville',
  supabaseClient: {
    db: {},
    doc: (...parts) => parts.slice(1).join('/'),
    setDoc: async (ref, value) => archives.set(ref, structuredClone(value)),
    getDoc: async ref => ({ exists: () => archives.has(ref), data: () => structuredClone(archives.get(ref)) })
  }
};
vm.createContext(c);
vm.runInContext([
  'getFirebaseValueByteSize', 'splitFirebaseArchiveValue', 'buildFirebaseSavePayload',
  'saveFirebaseArchiveDocuments', 'hydrateFirebaseArchivedState'
].map(extract).join('\n'), c);

(async () => {
  const payload = c.buildFirebaseSavePayload('2026-10-01T21:00:00.000Z');
  assert.equal(payload.main.state.billSnapshots, undefined);
  assert.equal(payload.main.state.billAuditLog, undefined);
  assert.equal(payload.main.state.history, undefined);
  assert.deepEqual(payload.main.state.bills, state.bills);
  assert(payload.archiveDocuments.length > 3, 'large values should split into bounded chunks');
  for (const archive of payload.archiveDocuments) {
    assert(c.getFirebaseValueByteSize(archive.values) <= c.FIREBASE_ARCHIVE_CHUNK_MAX_BYTES);
  }
  await c.saveFirebaseArchiveDocuments(payload.main.id, payload.archiveDocuments);
  const restored = await c.hydrateFirebaseArchivedState(payload.main, 'admin-glanville');
  assert.deepEqual(restored, state);

  archives.delete('tracker_state/admin-glanville/archives/history-0');
  await assert.rejects(c.hydrateFirebaseArchivedState(payload.main, 'admin-glanville'), /archive is incomplete/);
  console.log('PASS: Admin Firebase history is split into bounded versioned documents and incomplete archives never replace local state.');
})().catch(error => { console.error(error); process.exitCode = 1; });
