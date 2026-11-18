const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const C=require('../integrations/membership/core.js');
const time='2026-11-18T12:00:00.000Z',before='2026-11-18T11:00:00.000Z';
const location='JWpqvSmfgfac35fabPLX';
function fixture(){return {uid:'volunteer',application:{state:'accepted',title:'متطوع اختبار',phone:'+97330000001',consent:'yes',updatedAt:time},member:{state:'active',role:'member'},actors:{manager:{state:'active',role:'manager'}},audits:[{id:'aa',group:'applications',targetId:'volunteer',operation:'update',actorId:'manager',timestamp:time},{id:'ma',group:'members',targetId:'volunteer',operation:'create',actorId:'manager',timestamp:time}],startAt:before};}
test('paired durable audits recover an acceptance without a browser callback',()=>{
  const a=C.prove(fixture());assert.equal(a.eventKey,'membership-activated-v1:volunteer');assert.equal(a.template,'forum_membership_activated_ar');
  const changed=fixture();changed.application.auditId='later-edit';assert.equal(C.prove(changed).eventKey,a.eventKey);
});
test('old acceptances are held, including when a later paired edit exists',()=>{
  const x=fixture();x.startAt='2026-11-19T00:00:00Z';x.audits.push(...x.audits.map(a=>({...a,timestamp:'2026-11-20T00:00:00Z'})));
  assert.equal(C.prove(x).historical,true);
});
test('source and actor guards reject self acceptance, missing audit, consent, inactive and non-manager',()=>{
  for(const mutate of [x=>x.audits.forEach(a=>a.actorId=x.uid),x=>x.audits.pop(),x=>x.application.consent='no',x=>x.member.state='inactive',x=>x.actors.manager.role='deputy',x=>x.actors.manager.state='inactive']){
    const x=fixture();mutate(x);assert.throws(()=>C.prove(x));
  }
});
test('exact existing contact, official location and source name required; no contact writes',()=>{
  const src=C.prove(fixture()),c={id:'c1',name:src.title,phone:src.phone,locationId:location};
  assert.equal(C.contact(src,[c],location).id,'c1');
  for(const contacts of [[],[c,c],[{...c,phone:'+97330000002'}],[{...c,name:'اسم مختلف'}],[{...c,locationId:'other'}],[{...c,dnd:true}],[{...c,dndSettings:{WhatsApp:{status:'active'}}}]])assert.throws(()=>C.contact(src,contacts,location));
});
test('only provider message ID proves acceptance; never infer delivery/read',()=>{
  assert.equal(C.outcome(201,{messageId:'msg1'}).state,'sent');
  for(const [http,data] of [[200,{}],[500,{}],[400,{}],[429,{}],[200,{status:'delivered'}]])assert.equal(C.outcome(http,data).state,'unknown');
});
test('retry denied for ambiguous/started/sent attempts or unauthorized caller',()=>{
  assert.equal(C.retry({state:'failed',definitiveNoSend:true},true).state,'pending');
  for(const r of [{state:'unknown',definitiveNoSend:true},{state:'sent'},{state:'failed',definitiveNoSend:true,externalAttemptAt:time}])assert.throws(()=>C.retry(r,true));
  assert.throws(()=>C.retry({state:'failed',definitiveNoSend:true},false));
});
function encode(value){if(value===null)return{nullValue:null};if(Array.isArray(value))return{arrayValue:{values:value.map(encode)}};if(typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};return{[typeof value==='boolean'?'booleanValue':'stringValue']:value};}
function harness(options={}){
  const f=fixture(),store=new Map(),writes=[],requests=[],p={MEMBERSHIP_SEND_ENABLED:'true',MEMBERSHIP_START_AT:before,MEMBERSHIP_SANAD_TOKEN:'test-private-token',MEMBERSHIP_TEMPLATE_ID:'template-id',MEMBERSHIP_TEMPLATE_CONTRACT_VERIFIED:'true',MEMBERSHIP_WORKER_TOKEN:'x'.repeat(40),...options.props};
  const docs={applications:[{id:f.uid,...f.application}],members:[{id:f.uid,...f.member},{id:'manager',...f.actors.manager}],audit:f.audits};
  const makeDoc=d=>({name:'documents/'+d.id,fields:Object.fromEntries(Object.entries(d).filter(([k])=>k!=='id').map(([k,v])=>[k,encode(v)]))});
  const decode=v=>v.stringValue??v.booleanValue??v.nullValue??(v.arrayValue?(v.arrayValue.values||[]).map(decode):Object.fromEntries(Object.entries(v.mapValue.fields).map(([k,v])=>[k,decode(v)])));
  const context=vm.createContext({console,Date,JSON,Error,Object,Array,String,Number,RegExp,encodeURIComponent,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>p[k]})},ScriptApp:{getOAuthToken:()=> 'owner-oauth'},
    LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock:()=>{},releaseLock:()=>{}})},
    forumLedger_:()=>({get:k=>store.has(k)?JSON.parse(store.get(k)):null,put:(k,v)=>{store.set(k,JSON.stringify(v));writes.push(JSON.parse(JSON.stringify(v)));}}),
    forumIdentity_:token=>{if(token==='manager-token')return{uid:'manager'};if(token==='member-token')return{uid:'volunteer'};throw Error('unauthorized');},
    forumDecodeFirestore_:decode,
    UrlFetchApp:{fetch:(url,opt)=>{
      requests.push({url,opt});let code=200,data;
      if(url.startsWith('https://firestore.googleapis.com/')){
        const part=url.split('/media/')[1],g=part.split(/[/?]/)[0],id=part.includes('?')?null:part.split('/')[1];
        if(id){const doc=docs[g].find(d=>d.id===decodeURIComponent(id));code=doc?200:404;data=doc?makeDoc(doc):{};}
        else data={documents:docs[g].map(makeDoc)};
      }else if(url.endsWith('/contacts/search'))data={contacts:options.missingContact?[]:[{id:'contact1',name:f.application.title,phone:f.application.phone,locationId:location}],total:options.missingContact?0:1};
      else if(url.endsWith('/conversations/messages')){
        assert.equal(writes.at(-1).state,'processing');assert.ok(writes.at(-1).externalAttemptAt,'attempt persisted before POST');
        if(options.timeout)throw Error('timeout');data=options.noId?{}:{messageId:'provider-msg-1'};
      }else throw Error('unexpected-endpoint');
      return{getResponseCode:()=>code,getContentText:()=>JSON.stringify(data)};
    }}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../integrations/membership/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../integrations/membership/MembershipWhatsApp.gs'),'utf8'),context);
  return{context,requests,store,writes,p,docs,run:()=>context.mnWorker_({workerToken:'x'.repeat(40)})};
}
test('real adapter path: exact contact search then template POST, no CRM writes, repeat does not send again',()=>{
  const h=harness();assert.equal(h.run().state,'sent');assert.equal(h.run().state,'idle');
  const provider=h.requests.filter(r=>r.url.includes('leadconnectorhq.com'));
  assert.equal(provider.length,2);assert.equal(JSON.parse(provider[1].opt.payload).templateId,'template-id');
  assert.equal(JSON.parse(provider[1].opt.payload).contactId,'contact1');
  assert.equal(h.requests.some(r=>/\/contacts\/[^s]|\/tags|workflows/.test(r.url)),false);
});
test('timeout and success-without-ID remain unknown across recovery, no resend',()=>{
  for(const options of [{timeout:true},{noId:true}]){
    const h=harness(options);assert.equal(h.run().state,'unknown');h.run();assert.equal(h.requests.filter(r=>r.url.endsWith('/conversations/messages')).length,1);
    assert.equal(h.docs.members[0].state,'active');assert.equal(h.docs.applications[0].state,'accepted');
  }
});
test('preflight failure is retryable only before a provider send attempt',()=>{
  const h=harness({missingContact:true});assert.equal(h.run().state,'failed');assert.equal(h.requests.filter(r=>r.url.endsWith('/conversations/messages')).length,0);
  const record=JSON.parse([...h.store.values()][0]);assert.equal(C.publicStatus(record).retryable,true);
});
test('all live-operation gates default closed and invalid worker token is rejected',()=>{
  for(const props of [{MEMBERSHIP_SEND_ENABLED:'false'},{MEMBERSHIP_START_AT:''},{MEMBERSHIP_SANAD_TOKEN:''},{MEMBERSHIP_TEMPLATE_ID:''},{MEMBERSHIP_TEMPLATE_CONTRACT_VERIFIED:'false'}]){
    const h=harness({props});assert.equal(h.run().state,'disabled');assert.equal(h.requests.length,0);
  }
  const h=harness();assert.throws(()=>h.context.mnWorker_({workerToken:'wrong'}));assert.equal(h.requests.length,0);
});
test('public status never includes phone/name/source snapshots and non-manager cannot inspect/send',()=>{
  const h=harness();assert.throws(()=>h.context.mnPublic_({idToken:'member-token',uid:'volunteer',action:'membershipWhatsAppRetry'}));
  h.run();const value=h.context.mnPublic_({idToken:'manager-token',uid:'volunteer',action:'membershipWhatsAppStatus'});
  assert.deepEqual(Object.keys(value).sort(),['messageId','ok','retryable','state']);assert.equal(JSON.stringify(value).includes('+973'),false);
});
async function acceptanceFixture(options={}){
  const {acceptMembership}=await import(pathToFileURL(path.resolve(__dirname,'../membership-activation.mjs')));
  let next=0;const clock={isEqual:b=>b===clock},db={},rows=new Map([
    ['members/manager',{state:'active',role:options.revoked?'deputy':'manager'}],
    ['applications/volunteer',{title:'اسم من المصدر',state:options.accepted?'accepted':'submitted',updatedAt:clock,availability:'مساءً'}]
  ]);if(options.existing)rows.set('members/volunteer',{state:'inactive',role:'member',portalSections:['volunteer-space'],teamId:'preserve'});
  const sdk={doc:(group,id)=>({id:id||'audit'+(++next),path:group+'/'+(id||'audit'+next)}),serverTimestamp:()=>clock,
    runTransaction:async(_,work)=>{const writes=[];const tx={get:async ref=>({exists:()=>rows.has(ref.path),data:()=>rows.get(ref.path)}),set:(ref,data)=>writes.push([ref.path,data]),update:(ref,data)=>writes.push([ref.path,{...rows.get(ref.path),...data}])};await work(tx);for(const [key,value]of writes)rows.set(key,value);return writes;}};
  const run=(actor={uid:'manager',state:'active',role:'manager'})=>acceptMembership({sdk,db,collection:g=>g,actor,application:{id:'volunteer',updatedAt:clock}});
  return{rows,run};
}
test('actual acceptance function atomically activates minimal member, retains accepted application and both audits',async()=>{
  const h=await acceptanceFixture();await h.run();assert.equal(h.rows.get('applications/volunteer').state,'accepted');assert.equal(h.rows.get('members/volunteer').state,'active');assert.equal(h.rows.get('members/volunteer').role,'member');assert.deepEqual(h.rows.get('members/volunteer').portalSections,['volunteer-space']);assert.equal([...h.rows.keys()].filter(k=>k.startsWith('audit/')).length,2);
  await h.run();assert.equal([...h.rows.keys()].filter(k=>k.startsWith('audit/')).length,2);
});
test('existing assignment preserved; revoked/non-manager/self cannot accept',async()=>{
  const h=await acceptanceFixture({existing:true});await h.run();assert.equal(h.rows.get('members/volunteer').teamId,'preserve');
  const revoked=await acceptanceFixture({revoked:true});await assert.rejects(revoked.run());assert.equal(revoked.rows.get('applications/volunteer').state,'submitted');
  for(const actor of [{uid:'manager',state:'active',role:'member'},{uid:'volunteer',state:'active',role:'manager'}]){const h=await acceptanceFixture();await assert.rejects(h.run(actor));assert.equal(h.rows.size,2);}
});
test('accepted and pending list routes retained, no registration or receipt change required',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/visibleApplications=applications\.filter\(a=>a\.state!=='accepted'\)/);
  assert.match(html,/acceptedApplications=applications\.filter\(a=>a\.state==='accepted'\)/);
  assert.match(html,/countLink\(overview,'طلبات مقبولة'.*'الطلبات المقبولة'\)/);
});
