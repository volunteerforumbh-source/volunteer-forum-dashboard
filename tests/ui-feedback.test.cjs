// Run: node tests/ui-feedback.test.cjs <baseline-index.html>
// Baseline is exported from the main commit used for this UI branch.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const path=require('node:path');
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const baseline=fs.readFileSync(process.argv[2],'utf8');
const normalize=s=>s.replace(/\r\n/g,'\n').replace(/^\uFEFF/,'');
const matches=(source,re)=>[...source.matchAll(re)].map(m=>m[1]).sort();
function block(source,start,end) {
  source=normalize(source);
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert.ok(from>=0 && to>from,'Expected source block: '+start);
  return source.slice(from,to);
}
test('all section IDs, routes and control IDs are retained',()=>{
  assert.deepEqual(matches(current,/<section\b[^>]*id="([^"]+)"/g),matches(baseline,/<section\b[^>]*id="([^"]+)"/g));
  assert.deepEqual(matches(current,/href="([^"]+)"/g),matches(baseline,/href="([^"]+)"/g));
  assert.deepEqual(matches(current,/\bid="([^"]+)"/g),matches(baseline,/\bid="([^"]+)"/g));
});
test('Firebase membership verification, login/logout handlers and access rules are unchanged',()=>{
  assert.equal(normalize(block(current,'async function verifyPortalMembership','if (document.documentElement.dataset.portalAccess')),
    normalize(block(baseline,'async function verifyPortalMembership','if (document.documentElement.dataset.portalAccess')));
  assert.equal(normalize(block(current,'<script>\n  const sections','</script>')),normalize(block(baseline,'<script>\n  const sections','</script>')));
});
test('update data and chronological selection remain unchanged',()=>{
  const data=source=>block(source,'const forumUpdates =','const latestForumUpdates =');
  // The search section is intentionally included: its links and filtering must also stay intact.
  assert.equal(normalize(data(current)),normalize(data(baseline)));
  assert.match(current,/const latestForumUpdates = \[\.\.\.forumUpdates\]\.sort\(\(a,b\) => b.date.localeCompare\(a.date\)\)/);
});
test('formatted update dates use a consistent Gregorian date and preserve machine-readable value',()=>{
  const source=block(current,'const updateDateFormatter =','function updateRow');
  const context=vm.createContext({Intl,Date,createNode:(tag,cls,text)=>({tag,cls,text})});
  vm.runInContext(source+';globalThis.result=formatUpdateDate("2026-11-13");',context);
  assert.equal(context.result.dateTime,'2026-11-13');
  assert.equal(context.result.text,'13 نوفمبر 2026');
});
test('every inline classic script parses without changing its behavior',()=>{
  for(const [,attributes,source] of current.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!attributes.includes('module') && !attributes.includes('src=')) new vm.Script(source);
  }
});
