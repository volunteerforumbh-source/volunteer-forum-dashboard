import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'speaker-profiles.json'),'utf8'));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#524791','#167eae','#128577','#b24f79','#967011','#2c7488'];
function blocks(items){return items.map(b=>b.kind==='heading'?`<h4>${escape(b.text)}</h4>`:`<p class="speaker-source-paragraph">${escape(b.text)}</p>`).join('\n');}
function panel(p,part,title,body){return `<details class="speaker-panel" name="${p.prefix}-profile-panels" id="${p.prefix}-${part}"><summary>${escape(title)}</summary><div class="speaker-panel-body">${body}</div></details>`;}
function chart(p,q,index){
  if(!q.options.length)return `<div class="speaker-free-text"><h4>${escape(q.question)}</h4><p>عدد الاستجابات النصية: <bdi>${q.answered}</bdi>. لا تُنشر التعليقات الفردية أو البيانات المعرِّفة بالمستجيبين.</p></div>`;
  const denominator=p.survey.denominator==='total'?p.survey.total:q.answered;
  return `<figure class="speaker-chart" aria-labelledby="${p.prefix}-question-${index+1}"><figcaption id="${p.prefix}-question-${index+1}">${escape(q.question)}</figcaption><p class="speaker-question-count">عدد الإجابات: <bdi>${q.answered}</bdi> · أساس النسبة: <bdi>${denominator}</bdi> ${p.survey.denominator==='total'?'استجابة مسجلة':'إجابة عن السؤال'}.</p>${q.options.map((o,i)=>{
    if(!Number.isFinite(o.percent)||o.percent<0||o.percent>100||!Number.isInteger(o.count)||o.count<0)throw Error('Invalid survey option');
    return `<div class="speaker-chart-row"><div class="speaker-chart-label"><span>${escape(/^\d$/.test(o.label)?'الدرجة '+o.label+' من 5':o.label)}</span><strong><bdi>${o.count}</bdi> إجابة · <bdi>${o.percent}%</bdi></strong></div><div class="speaker-chart-track" role="img" aria-label="${escape(o.label)}: ${o.count} استجابة، ${o.percent} بالمئة"><span style="width:${o.percent}%;background:${colors[i%colors.length]}"></span></div></div>`;
  }).join('')}</figure>`;
}
function profile(p){
  const reportAxes=p.report.map(a=>`<details class="speaker-report-axis" name="${p.prefix}-report-axes" id="${p.prefix}-axis-${a.number}"><summary>${escape(a.title)}</summary><div class="speaker-axis-body">${blocks(a.blocks)}</div></details>`).join('\n');
  const reportIntro=`<div class="speaker-report-intro">${p.reportNote?`<p class="speaker-note">${escape(p.reportNote)}</p>`:''}<a class="btn secondary" download="تقرير-${escape(p.name).replaceAll(' ','-')}.pdf" href="./${p.reportPdf}">${escape(p.reportLabel||'تنزيل التقرير الكامل PDF')}</a>${p.paperPdf&&p.showOriginalPaper!==false?` <a class="btn secondary" href="./${p.paperPdf}" download="ورقة-بدر-الغريفي.pdf">تنزيل الورقة الأصلية PDF</a>`:''}</div>`;
  const audience=`<p class="speaker-survey-context">أُرسلت هذه الاستبانة إلى الحضور مباشرة بعد الانتهاء من ورقة العمل، وتعرض الرسوم التالية نتائج إجاباتهم.</p><p>تاريخ التقرير: <time datetime="${p.survey.date}">${p.survey.dateLabel}</time> · عدد الاستجابات المسجلة: <strong><bdi>${p.survey.total}</bdi></strong>.</p><p class="speaker-note">هذه استجابات، وليست بالضرورة أشخاصًا فريدين. النسب وصفية أولية؛ يُبيَّن أساس النسبة وعدد الإجابات لكل سؤال. لا تمثل الخيارات الأعلى توصيات رسمية معتمدة.</p>${p.survey.questions.map((q,i)=>chart(p,q,i)).join('\n')}`;
  const media=`${typeof p.video==='string'?`<figure class="speaker-video"><figcaption>نبض جمعية توبلي — فيديو المشروع المرفق، وليس تسجيلًا كاملًا للورقة.</figcaption><video controls preload="none" playsinline aria-label="نبض جمعية توبلي"><source src="./${p.video}" type="video/mp4">متصفحك لا يدعم تشغيل الفيديو.</video></figure>`:p.prefix==='safiya'?'<p>أُرفق فيديو للمشروع بعنوان «نبض جمعية توبلي»، وما زالت نسخة العرض داخل البوابة قيد التجهيز. لم يُرفق تسجيل كامل للورقة.</p>':'<p>لم يُرفق تسجيل فيديو قابل للعرض العام لهذه المشاركة بعد.</p>'}<figure class="speaker-photo"><img src="./${p.photo}" alt="${escape(p.photoNote||'صورة '+p.name+' من مجلد المتحدث')}" loading="lazy"><figcaption>${escape(p.photoNote||'الصورة المرفقة بملف '+p.name)}</figcaption></figure>`;
  return `<details class="speaker-profile" name="forum-speaker-profiles" id="speaker-${p.slug}"><summary>${escape(p.name)}</summary><div class="speaker-profile-body"><div class="speaker-identity"><img src="./${p.photo}" alt="${escape(p.photoNote||'صورة '+p.name)}" width="180" height="238" loading="lazy"><div><h3>${escape(p.honorific+' '+p.name)}</h3><p class="speaker-paper-title">${escape(p.title)}</p>${p.subtitle?`<p>${escape(p.subtitle)}</p>`:''}</div></div>
${panel(p,'bio','التعريف بالمتحدث والسيرة الذاتية',`<ul class="speaker-bio-points">${p.bio.map(b=>`<li>${escape(b)}</li>`).join('')}</ul><p class="speaker-note">${escape(p.bioNote)}</p>`)}
${panel(p,'paper','ورقة العمل',`<h4>${escape(p.title)}</h4><p>${escape(p.brief)}</p>`)}
${panel(p,'report','تقرير الورقة والتوصيات',reportIntro+reportAxes)}
${panel(p,'audience','تفاعل الحضور والرسوم البيانية',audience)}
${panel(p,'media','الفيديو والصور',media)}
</div></details>`;
}
const htmlFile=path.join(root,'index.html');
let html=fs.readFileSync(htmlFile,'utf8');
const start='<!-- SPEAKER PROFILES START -->',end='<!-- SPEAKER PROFILES END -->';
const generated=`${start}\n<li><details id="speaker-papers"><summary>المتحدثون وأوراقهم</summary><div class="speaker-directory">\n${data.speakers.map(profile).join('\n')}\n</div></details></li>\n${end}`;
if(html.includes(start))html=html.slice(0,html.indexOf(start))+generated+html.slice(html.indexOf(end)+end.length);
else {
  const from=html.lastIndexOf('<li><details id="speaker-papers"');
  const to=html.indexOf('<li><details id="media-coverage"',from);
  if(from<0||to<from)throw Error('Speaker replacement boundary missing');
  html=html.slice(0,from)+generated+'\n'+html.slice(to);
  const legacy=html.indexOf('      <li><details><summary>المتحدثون وأوراق العمل</summary>');
  const legacyEnd=html.indexOf('      <li><details><summary>الجمعيات المشاركة</summary>',legacy);
  if(legacy>=0&&legacyEnd>legacy)html=html.slice(0,legacy)+html.slice(legacyEnd);
  const legacyScript=html.indexOf("for(const panel of document.querySelectorAll('#speaker-mohammed-altooq");
  if(legacyScript>=0){const scriptStart=html.lastIndexOf('<script>',legacyScript);const scriptEnd=html.indexOf('</script>',legacyScript);html=html.slice(0,scriptStart)+html.slice(scriptEnd+9);}
  html=html.replace('</head>','<link rel="stylesheet" href="./speaker-profiles.css">\n<script src="./speaker-profiles.js" defer></script>\n</head>');
}
fs.writeFileSync(htmlFile,html.replace(/\r\n/g,'\n'));
console.log('Built '+data.speakers.length+' speaker profiles');
