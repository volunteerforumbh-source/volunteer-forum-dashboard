const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../integrations/membership/SanadVolunteerIntakeCore.js');
const mapping={verified:true,phoneKey:'phone',consentKey:'terms',consentValue:true};
const fixture=()=>({id:'synthetic-submission',contactId:'synthetic-contact',formId:C.formId,name:'اسم اختبار',email:'Test@Example.org',createdAt:'2026-11-18T13:00:00Z',others:{phone:'+97330000001',terms:true}});
test('intake uses immutable form submission and leaves membership, Google response ID and future consent untouched',()=>{const r=C.normalize(fixture(),mapping),v=C.row(r);assert.equal(v.length,26);assert.equal(v[1],'');assert.equal(v[16],'');assert.equal(v[6],'test@example.org');assert.equal(v[23],'NO_SEND_PENDING_GOOGLE');assert.equal(v[25],'synthetic-contact');assert.equal(v[17],'بانتظار تأكيد حساب Google والمراجعة');});
test('wrong form, missing consent, unchecked consent and unverified mapping fail closed',()=>{for(const change of [s=>s.formId='other',s=>delete s.others.terms,s=>s.others.terms=false,s=>s.others.terms='true',s=>s.email='invalid',s=>s.others.phone='30000001']){const s=fixture();change(s);assert.throws(()=>C.normalize(s,mapping));}assert.throws(()=>C.normalize(fixture(),{...mapping,verified:false}));assert.throws(()=>C.normalize({...fixture(),others:{phone:'+97330000001',terms:false}},{...mapping,consentValue:false}));});
test('replayed submission cannot append twice; changed submission for same contact or email requires review',()=>{const s=fixture(),r=C.normalize(s,mapping),rows=[C.row(r)];assert.equal(C.decide(r,rows),'duplicate');s.id='second';assert.equal(C.decide(C.normalize(s,mapping),rows),'review-existing-application');s.contactId='other';assert.equal(C.decide(C.normalize(s,mapping),rows),'review-existing-application');});
test('older portal or Google Forms applications also block duplicate creation without overwriting them',()=>{const r=C.normalize(fixture(),mapping),old=Array(26).fill('');old[0]='OLD-001';old[6]=r.email;assert.equal(C.decide(r,[old]),'review-existing-application');assert.equal(old[0],'OLD-001');old[6]='other@example.org';old[25]=r.contactId;assert.equal(C.decide(r,[old]),'review-existing-application');});
test('sheet formula injection is neutralized and malformed headers stop writes',()=>{const s=fixture();s.name='=IMPORTXML("https://example.org","x")';const v=C.row(C.normalize(s,mapping));assert.equal(v[4][0],"'");assert.equal(v[5][0],"'");assert.equal(C.sameHeaders(C.headers),true);assert.equal(C.sameHeaders(['changed',...C.headers.slice(1)]),false);});
test('Apps Script read probe never logs response records or secrets; closed sync cannot make requests',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),requests=[],logs=[];
  const context=vm.createContext({console:{log:x=>logs.push(x)},Date,JSON,Error,Object,Array,String,Number,RegExp,module:{exports:{}},
    Session:{getEffectiveUser:()=>({getEmail:()=> 'volunteerforumbh@gmail.com'})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='MEMBERSHIP_SANAD_TOKEN'?'synthetic-secret':null})},
    Utilities:{formatDate:()=> '2026-11-18'},UrlFetchApp:{fetch:(url,opt)=>{requests.push({url,opt});return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({submissions:[fixture()],meta:{nextPage:null}})};}}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../integrations/membership/SanadVolunteerIntakeCore.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../integrations/membership/SanadVolunteerIntake.gs'),'utf8'),context);
  context.testSanadVolunteerFormRead();assert.equal(requests.length,1);assert.equal(requests[0].opt.method,'get');assert.equal(JSON.parse(logs[0]).submissionsOnPage,1);
  for(const secret of ['synthetic-secret','اسم اختبار','test@example.org','+973','synthetic-contact'])assert.equal(logs.join('').includes(secret),false);
  assert.throws(()=>context.syncSanadVolunteerOne(),/intake-disabled/);assert.equal(requests.length,1);
});
