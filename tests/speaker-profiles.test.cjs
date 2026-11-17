const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),data=require('../speaker-profiles.json'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('seven speakers have independent source totals, reports and local portraits',()=>{
  assert.equal(data.speakers.length,7);
  assert.deepEqual(data.speakers.map(p=>p.survey.total),[55,56,41,72,49,30,39]);
  for(const key of ['name','slug','prefix','reportPdf','photo'])assert.equal(new Set(data.speakers.map(p=>p[key])).size,7,key);
  for(const p of data.speakers){assert.ok(p.report.length>=4);assert.equal(p.survey.date,'2026-11-06');assert.equal(p.survey.questions.length,6);assert.ok(fs.statSync(path.join(root,p.photo)).size>1000);}
});
test('all 35 quantitative questions preserve counts and percentages with the stated denominator',()=>{
  let charts=0;
  for(const p of data.speakers)for(const q of p.survey.questions){
    if(!q.options.length)continue;charts++;
    assert.equal(q.options.reduce((sum,o)=>sum+o.count,0),q.answered,p.name+': '+q.question);
    const denominator=p.survey.denominator==='total'?p.survey.total:q.answered;
    for(const o of q.options){assert.ok(Number.isInteger(o.count)&&o.count>=0);assert.ok(Math.abs(100*o.count/denominator-o.percent)<=.051,p.name+': '+o.label);assert.ok(o.percent>=0&&o.percent<=100);}
  }
  assert.equal(charts,35);
});
test('all direct speaker/panel/axis anchors are unique; original Altooq links survive',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const p of data.speakers){for(const id of ['speaker-'+p.slug,...['bio','paper','report','audience','media'].map(s=>p.prefix+'-'+s),...p.report.map(a=>p.prefix+'-axis-'+a.number)])assert.ok(ids.includes(id),id);}
  for(const id of ['speaker-papers','speaker-mohammed-altooq','altooq-bio','altooq-paper','altooq-report','altooq-axis-2','altooq-axis-3','altooq-axis-4','altooq-audience','altooq-media'])assert.ok(ids.includes(id));
});
test('all configured report and paper downloads are real PDFs; Badr summary remains available',()=>{
  for(const p of data.speakers)for(const file of [p.reportPdf,p.paperPdf].filter(Boolean)){const bytes=fs.readFileSync(path.join(root,file));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>10000);assert.ok(bytes.subarray(-200).toString().includes('%%EOF'));}
  const badr=data.speakers.find(p=>p.prefix==='badr');assert.ok(badr.reportPdf);assert.match(badr.reportNote,/الملخص التنفيذي/);
});
test('the available project video is local and only belongs to Safiya',()=>{
  const available=data.speakers.filter(p=>typeof p.video==='string');assert.equal(available.length,1);assert.equal(available[0].prefix,'safiya');
  const video=fs.readFileSync(path.join(root,available[0].video));assert.equal(video.subarray(4,8).toString(),'ftyp');assert.ok(video.length>5000000);
  assert.match(html,/<video controls preload="none" playsinline/);
});
test('public profiles exclude administrative forms, raw correspondence and prohibited links',()=>{
  const profiles=html.slice(html.indexOf('<!-- SPEAKER PROFILES START -->'),html.indexOf('<!-- SPEAKER PROFILES END -->'));
  for(const forbidden of ['عرض النص الأصلي المستلم','فتح تقرير تفاعل الحضور الكامل','طيّ الكل','فتح ملف المتحدث','.lnk','forms/d/','@gmail.com'])assert.ok(!profiles.includes(forbidden),forbidden);
  assert.equal((profiles.match(/أُرسلت هذه الاستبانة/g)||[]).length,7);
  assert.equal((profiles.match(/name="forum-speaker-profiles"/g)||[]).length,7);
  assert.match(html,/if \(section !== 'news'\) document.documentElement.dataset.portalAccess = 'locked'/);
  new vm.Script(fs.readFileSync(path.join(root,'speaker-profiles.js'),'utf8'));
});
