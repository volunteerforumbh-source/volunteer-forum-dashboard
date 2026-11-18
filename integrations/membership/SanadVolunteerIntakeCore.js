/* Pure intake policy. No contact writes, membership activation or messaging. */
var SanadVolunteerIntakeCore = (() => {
  'use strict';
  const formId = '4bNsGJnCWXC7XdEuIxH6';
  const source = 'SanadForm:' + formId;
  const headers = ['رقم طلب التطوع','معرف رد Google Forms','تاريخ ووقت التسجيل','رابط الرسالة الشخصية الأولى','الاسم الكامل','رقم الهاتف','البريد الإلكتروني','الجمعية','مسار المشاركة','مجالات التطوع','مستوى الخبرة','متفرغ 31 أكتوبر؟','الحضور المبكر','فترات التفرغ','مصدر الوصول','موافقة استخدام البيانات','الموافقة على فرص مستقبلية','الحالة','مسؤول المراجعة','القرار البشري','تاريخ القرار','ملاحظات المراجعة','حالة بريد التأكيد','حالة إشعارات النواة','آخر خطأ بريد','رابط أو معرف جهة الاتصال إن وجد'];
  const id = x => { if(typeof x !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(x)) throw Error('invalid-id'); return x; };
  const email = x => { const v=String(x||'').trim().toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)||v.length>254)throw Error('invalid-email'); return v; };
  const phone = x => { const v=String(x||'').trim().replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)&15)).replace(/[\s()-]/g,'').replace(/^00/,'+'); if(!/^\+[1-9]\d{7,14}$/.test(v))throw Error('invalid-phone'); return v; };
  const cell = x => /^[\s]*[=+@-]/.test(String(x)) ? "'"+String(x) : String(x);
  function normalize(s, mapping) {
    if(s?.formId!==formId)throw Error('wrong-form');
    const submissionId=id(s.id),contactId=id(s.contactId);
    if(!mapping || !mapping.verified || !id(mapping.phoneKey) || !id(mapping.consentKey))throw Error('field-map-unverified');
    if(![true,'yes','نعم','موافق'].includes(mapping.consentValue))throw Error('consent-map-unverified');
    const other=s.others;
    if(!other || !Object.prototype.hasOwnProperty.call(other,mapping.phoneKey) || !Object.prototype.hasOwnProperty.call(other,mapping.consentKey))throw Error('missing-source-fields');
    if(other[mapping.consentKey]!==mapping.consentValue)throw Error('consent-not-proven');
    const name=String(s.name||'').trim(); if(!name || name.length>200)throw Error('invalid-name');
    if(typeof s.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(s.createdAt)||!Number.isFinite(Date.parse(s.createdAt)))throw Error('invalid-time');
    return {key:'SV1-'+formId+'-'+submissionId,submissionId,contactId,name,email:email(s.email),phone:phone(other[mapping.phoneKey]),createdAt:new Date(s.createdAt).toISOString(),source};
  }
  function decide(record,rows) {
    if(rows.some(r=>r[0]===record.key))return 'duplicate';
    // Include older Google Forms/portal rows as well; never silently create a second application.
    if(rows.some(r=>String(r[25])===record.contactId || String(r[6]).trim().toLowerCase()===record.email))return 'review-existing-application';
    return 'append-pending';
  }
  function row(r) {
    const v=Array(26).fill('');
    v[0]=r.key;v[2]=r.createdAt;v[4]=r.name;v[5]=r.phone;v[6]=r.email;
    v[8]='طلب التطوع وعضوية البوابة';v[14]=source;v[15]='موافقة موثقة من الاستمارة — عضوية فقط';
    v[17]='بانتظار تأكيد حساب Google والمراجعة';v[22]='لم يُرسل';v[23]='NO_SEND_PENDING_GOOGLE';v[25]=r.contactId;
    return v.map(cell);
  }
  function sameHeaders(actual) { return headers.every((v,i)=>String(actual[i]||'').trim()===v); }
  return {formId,source,headers,normalize,decide,row,sameHeaders};
})();
if(typeof module!=='undefined')module.exports=SanadVolunteerIntakeCore;
