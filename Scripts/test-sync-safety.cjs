const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  const rest = source.slice(start);
  const end = rest.slice(1).search(/\n(?:async )?function /);
  return end < 0 ? rest : rest.slice(0, end + 1);
}
function setup() {
  const storage = new Map();
  const c = {structuredClone, Date, JSON, Blob, URL, setTimeout, console,
    supabaseEnabled:true, activeClientId:'admin', applyingRemoteState:false,
    state:{tasks:[], bills:[{name:'Test',currentBalance:100}],lastSavedAt:'local'},
    pendingLocalSharedSaveAt:'', sharedSaveInFlight:null, remoteUpdatedAt:'v1',
    SUPABASE_TABLE:'states', supabaseStatus:'', billSyncAlertState:null,
    getSupabaseStateId:()=> 'admin', getStorageKey:()=> 'admin-cache',
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    assessAdminBillDataLoss:()=>null, renderBillSyncAlert:()=>{},updateDataStoreStatus:()=>{},formatDateTime:v=>v,
    cacheRemoteUpdatedAt:v=>c.remoteUpdatedAt=v,blockAdminBillDataLoss:()=>{},
    currentClientConfig:()=>({shortName:'Admin'}), userSelect:{}, render:()=>{},
    writes:[], live:{updated_at:'v1',state:{tasks:[],bills:[{name:'Test',currentBalance:100}]}},
    supabaseClient:{db:{},doc:()=>({}),runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>c.live}),set:(_,payload)=>c.writes.push(structuredClone(payload))})}
  };
  vm.createContext(c);
  vm.runInContext(['showSharedSaveConflict','saveSharedStateNow','setCurrentUserEmail'].map(extract).join('\n'),c);
  return c;
}
(async()=>{
  let c=setup(); const bills=JSON.stringify(c.state.bills);
  c.setCurrentUserEmail('user@example.test'); await c.saveSharedStateNow();
  assert.equal(c.writes.length,0); assert.equal(JSON.stringify(c.state.bills),bills);
  c=setup();c.pendingLocalSharedSaveAt='edit1';c.live.updated_at='v2';
  await assert.rejects(c.saveSharedStateNow(),/shared version changed/);
  assert.equal(c.writes.length,0);assert.equal(c.pendingLocalSharedSaveAt,'edit1');assert.equal(c.billSyncAlertState.kind,'save-conflict');
  assert.equal(c.state.bills[0].currentBalance,100);
  c=setup();c.pendingLocalSharedSaveAt='edit1';await c.saveSharedStateNow();
  assert.equal(c.writes.length,1);assert.equal(c.pendingLocalSharedSaveAt,'');
  assert.equal(JSON.stringify(c.writes[0].state),JSON.stringify(c.state));
  c=setup();c.pendingLocalSharedSaveAt='edit1';c.remoteUpdatedAt='';
  await assert.rejects(c.saveSharedStateNow(),/shared version changed/);assert.equal(c.writes.length,0);
  c=setup();c.pendingLocalSharedSaveAt='edit1';c.assessAdminBillDataLoss=()=>({removedBills:5});
  await assert.rejects(c.saveSharedStateNow(),/data-loss protection/);assert.equal(c.writes.length,0);assert.equal(c.pendingLocalSharedSaveAt,'edit1');
  c=setup();c.pendingLocalSharedSaveAt='edit1';
  c.supabaseClient.runTransaction=async(_,fn)=>fn({get:async()=>{c.state.bills[0].currentBalance=80;c.pendingLocalSharedSaveAt='edit2';return {exists:()=>true,data:()=>c.live};},set:(_,p)=>c.writes.push(structuredClone(p))});
  await c.saveSharedStateNow();assert.equal(c.writes[0].state.bills[0].currentBalance,100);assert.equal(c.state.bills[0].currentBalance,80);assert.equal(c.pendingLocalSharedSaveAt,'edit2');
  c=setup();c.pendingLocalSharedSaveAt='edit1';c.supabaseClient.runTransaction=async()=>{throw Error('offline');};
  await assert.rejects(c.saveSharedStateNow(),/offline/);assert.equal(c.pendingLocalSharedSaveAt,'edit1');assert.equal(c.sharedSaveInFlight,null);
  c=setup();c.pendingLocalSharedSaveAt='edit1';
  c.supabaseClient.runTransaction=async(_,fn)=>{await fn({get:async()=>({exists:()=>true,data:()=>c.live}),set:()=>{}});c.live.updated_at='v2';await fn({get:async()=>({exists:()=>true,data:()=>c.live}),set:(_,p)=>c.writes.push(p)});};
  await assert.rejects(c.saveSharedStateNow(),/shared version changed/);assert.equal(c.writes.length,0);
  c=setup();
  Object.assign(c,{stopSharedStateSync:()=>{},sharedStateListenerId:'',sharedStateUnsubscribe:null,
    refreshSignalListenerId:'',refreshSignalUnsubscribe:null,FIREBASE_REFRESH_SIGNAL_TABLE:'refresh',
    applied:[],applyRemoteSharedState:(s,v)=>{c.applied.push(structuredClone(s));c.remoteUpdatedAt=v;},
    callbacks:[],window:{setTimeout:()=>{}},DEVICE_SESSION_ID:'test',lastSeenRefreshSignalAt:''});
  c.supabaseClient.onSnapshot=(ref,options,callback)=>{c.callbacks.push(typeof options==='function'?options:callback);return ()=>{};};
  vm.runInContext(extract('subscribeToSharedState'),c);
  let connecting=c.subscribeToSharedState();
  await c.callbacks[0]({metadata:{fromCache:true},exists:()=>true,data:()=>c.live});
  assert.equal(c.applied.length,0);
  c.live.updated_at='v2';
  await c.callbacks[0]({metadata:{fromCache:false},exists:()=>true,data:()=>c.live});
  await connecting;
  assert.equal(c.applied.length,1);assert.equal(c.writes.length,0);
  c.pendingLocalSharedSaveAt='pending';c.live.updated_at='v3';
  await c.callbacks[0]({metadata:{fromCache:false},exists:()=>true,data:()=>c.live});
  assert.equal(c.applied.length,1);assert.equal(c.pendingLocalSharedSaveAt,'pending');assert.equal(c.writes.length,0);
  c=setup();Object.assign(c,{window:{clearTimeout:()=>{}},supabaseSaveTimer:null,confirm:()=>false});
  c.supabaseClient.getDoc=async()=>({exists:()=>true,data:()=>c.live});
  let applied=0;c.applyRemoteSharedState=()=>applied++;
  vm.runInContext(extract('pullLatestSharedState'),c);
  c.pendingLocalSharedSaveAt='pending';
  await assert.rejects(c.pullLatestSharedState(),/cancelled/);assert.equal(applied,0);assert.equal(c.pendingLocalSharedSaveAt,'pending');
  c.pendingLocalSharedSaveAt='';c.assessAdminBillDataLoss=()=>({removedBills:5});
  await assert.rejects(c.pullLatestSharedState(),/data-loss protection/);assert.equal(applied,0);
  c.assessAdminBillDataLoss=()=>null;c.supabaseClient.getDoc=async()=>{c.pendingLocalSharedSaveAt='new-edit';return {exists:()=>true,data:()=>c.live};};
  await assert.rejects(c.pullLatestSharedState(),/New edits/);assert.equal(applied,0);assert.equal(c.pendingLocalSharedSaveAt,'new-edit');
  assert(!source.includes('autoCalculateBillsOnLoadPending'));
  console.log('PASS: server-only login sync, pending listener edits retained, cancelled/racing/destructive pulls blocked; login is read-only, stale/unknown baselines blocked, exact payload saved, concurrent local edits preserved, offline edits retained, transaction retry conflict blocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
