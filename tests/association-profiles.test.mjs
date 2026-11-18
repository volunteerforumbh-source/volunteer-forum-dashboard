import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeAssociationSearch,associationNewsMatches} from '../association-profiles.js';
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
const directory=html.slice(html.indexOf('<div class="association-directory" id="association-directory">'),html.indexOf('<section id="member-updates">'));
const ids=['naim','ras-rumman','aleker','alhaddada','nabih-saleh','manama','sitra','tubli','sanabis','iskan-jidhafs','daih'];

test('eleven existing associations retain seven independent panels and local source logos',()=>{
  assert.equal((directory.match(/class="association-profile"/g)||[]).length,11);
  for(const id of ids){
    assert.ok(directory.includes(`id="association-${id}"`));
    for(const panel of ['about','vision','services','programs','news','forum','contact'])assert.ok(directory.includes(`id="association-${id}-${panel}"`));
    const bytes=fs.readFileSync(new URL(`assets/associations/${id}.webp`,root));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.ok(bytes.length>1000&&bytes.length<50000);
  }
  assert.equal((directory.match(/class="association-panel"/g)||[]).length,77);
  assert.doesNotMatch(directory,/طيّ? الكل|data:image|\.lnk|mailto:|tel:/);
});
test('Arabic association search accepts spelling and diacritic variants without conflating names',()=>{
  assert.ok(normalizeAssociationSearch('جمعية إسكان جدحفص الخيرية').includes(normalizeAssociationSearch('اسكان')));
  assert.equal(normalizeAssociationSearch('جَمْعِيَّةُ النَّعِيمِ'),normalizeAssociationSearch('جمعية النعيم'));
  assert.ok(!normalizeAssociationSearch('جمعية رأس الرمان الخيرية').includes(normalizeAssociationSearch('المنامة')));
});
test('news membership requires explicit approval and exact association ID',()=>{
  assert.equal(associationNewsMatches('approved','sitra tubli sanabis','tubli'),true);
  for(const status of ['draft','pending','rejected',''])assert.equal(associationNewsMatches(status,'tubli','tubli'),false);
  assert.equal(associationNewsMatches('approved','not-tubli tubli-west','tubli'),false);
  assert.equal(associationNewsMatches('approved','manama','naim'),false);
  assert.equal(associationNewsMatches('approved',null,'naim'),false);
});
test('canonical archive has four explicit relationships, with no copied news body in profiles',()=>{
  const rows=[...html.matchAll(/<li data-publication-status="approved" data-association-ids="([^"]+)"[^>]*><details id="(association-news-[^"]+)"/g)];
  assert.equal(rows.length,4);
  const expected={naim:1,'ras-rumman':1,aleker:1,alhaddada:2,'nabih-saleh':2,manama:2,sitra:2,tubli:2,sanabis:2,'iskan-jidhafs':2,daih:2};
  for(const id of ids)assert.equal(rows.filter(r=>associationNewsMatches('approved',r[1],id)).length,expected[id],id);
  assert.ok(directory.includes('data-association-news="naim"'));
  assert.doesNotMatch(directory,/DeouvWWFLjw|DejkoYglU-F|news-participation-form/);
});
test('anchors are unique and inherited public contact links and source records remain',()=>{
  const anchors=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(anchors).size,anchors.length);
  for(const account of ['naimcharity','rasrummancharity','alekercharity','alhaddada_charity','nscs_bh','manama_charity','sitrasociety','tublicharity','sanabisfund','iskancharity','daihcharity'])assert.ok(directory.includes(`https://www.instagram.com/${account}/`));
  assert.equal((directory.match(/datetime="2026-11-18"/g)||[]).length,11);
  assert.ok(directory.includes('جمعية شريكة في المنتدى الثاني للعمل التطوعي 2026'));
  assert.doesNotMatch(directory,/لم [يت]ُرفق|لا يُستنتج|يرد تاريخ البداية|المصدرين/);
  assert.ok(html.includes("if (section !== 'news') document.documentElement.dataset.portalAccess = 'locked';"));
  assert.ok(html.includes('id="association-search"'));assert.ok(html.includes('id="association-count"'));
});
