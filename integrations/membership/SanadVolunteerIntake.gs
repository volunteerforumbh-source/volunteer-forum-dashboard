/* Preparation only. Install after SanadVolunteerIntakeCore.js in existing helper.
 * No public doPost route, no scheduler and no send/contact/tag APIs.
 */
const SV_LOCATION_='JWpqvSmfgfac35fabPLX';
const SV_SHEET_='1kfoULs8mq2GkMyRG2Hgu7iBpr7KQ1KzpMGhmBZitT5w';
function svOwner_(){if(Session.getEffectiveUser().getEmail()!=='volunteerforumbh@gmail.com')throw Error('owner-account-required');}
function svPage_(page){
  const token=PropertiesService.getScriptProperties().getProperty('MEMBERSHIP_SANAD_TOKEN');
  if(!token)throw Error('sanad-token-missing');
  const end=Utilities.formatDate(new Date(),'Asia/Bahrain','yyyy-MM-dd');
  const url='https://services.leadconnectorhq.com/forms/submissions?locationId='+SV_LOCATION_+'&formId='+SanadVolunteerIntakeCore.formId+'&startAt=2026-11-18&endAt='+end+'&page='+page+'&limit=100';
  const r=UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Bearer '+token,Version:'v3'},muteHttpExceptions:true,followRedirects:false});
  const http=r.getResponseCode();if(http!==200)return {http};
  let data;try{data=JSON.parse(r.getContentText());}catch(_){throw Error('invalid-provider-response');}
  if(!Array.isArray(data.submissions))throw Error('invalid-provider-response');
  if(data.submissions.some(s=>s.formId!==SanadVolunteerIntakeCore.formId))throw Error('unexpected-form');
  return {http,data};
}
function testSanadVolunteerFormRead(){
  svOwner_();const r=svPage_(1);
  console.log(JSON.stringify({ok:r.http===200,http:r.http,submissionsOnPage:r.data?.submissions.length||0,hasNextPage:Boolean(r.data?.meta?.nextPage),sheetWriteAttempted:false,contactWriteAttempted:false,sendAttempted:false}));
}
function syncSanadVolunteerOne(){
  svOwner_();const p=PropertiesService.getScriptProperties();
  if(p.getProperty('SV_INTAKE_ENABLED')!=='true'||p.getProperty('SV_WORKFLOW_AUDIT_PASSED')!=='true'||p.getProperty('SV_SCHEMA_VERIFIED')!=='true')throw Error('intake-disabled');
  const mapping={verified:true,phoneKey:p.getProperty('SV_PHONE_FIELD_KEY'),consentKey:p.getProperty('SV_CONSENT_FIELD_KEY'),consentValue:JSON.parse(p.getProperty('SV_CONSENT_VALUE_JSON')||'null')};
  const r=svPage_(1);if(r.http!==200)throw Error('provider-read-unavailable');
  // No partial-page import or silent loss. Pagination must be added/tested before scale-up.
  if(r.data.meta?.nextPage)throw Error('pagination-needs-review');
  const submissions=[...r.data.submissions].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const sheet=SpreadsheetApp.openById(SV_SHEET_).getSheetByName('طلبات التطوع 2026');
    if(!sheet || sheet.getMaxColumns()<26 || !SanadVolunteerIntakeCore.sameHeaders(sheet.getRange(1,1,1,26).getDisplayValues()[0]))throw Error('sheet-schema-changed');
    const last=sheet.getLastRow();if(last>10000)throw Error('sheet-scan-limit');
    const rows=last>1?sheet.getRange(2,1,last-1,26).getDisplayValues():[];
    for(const s of submissions){
      const record=SanadVolunteerIntakeCore.normalize(s,mapping),decision=SanadVolunteerIntakeCore.decide(record,rows);
      if(decision==='duplicate')continue;
      if(decision!=='append-pending')throw Error('existing-application-needs-review');
      sheet.getRange(last+1,1,1,26).setValues([SanadVolunteerIntakeCore.row(record)]);SpreadsheetApp.flush();
      console.log(JSON.stringify({ok:true,appended:1,state:'pending-google-and-review',sendAttempted:false,contactWriteAttempted:false}));return;
    }
    console.log(JSON.stringify({ok:true,appended:0,sendAttempted:false}));
  }finally{lock.releaseLock();}
}
