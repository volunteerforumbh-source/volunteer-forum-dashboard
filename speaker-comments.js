/* Moderated public speaker questions. Only approved messages are readable publicly. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,doc,setDoc,updateDoc,getDocs,query,where,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp({apiKey:'AIzaSyASssLjqgz-IViLCvPwDhjLayhLiDi2mGc',authDomain:'forum-committee-membership.firebaseapp.com',projectId:'forum-committee-membership',storageBucket:'forum-committee-membership.firebasestorage.app',messagingSenderId:'486503955171',appId:'1:486503955171:web:b930db260197d4614ea3d6'});
const db=getFirestore(app),auth=getAuth(app);
const kinds={question:'سؤال للمتحدث',comment:'تعليق',experience:'تجربة مرتبطة بالورقة'};
const moderator=()=>auth.currentUser?.emailVerified&&auth.currentUser.email==='jaffernasheet@gmail.com';
const node=(tag,text,parent)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(parent)parent.append(e);return e;};
for(const profile of document.querySelectorAll('.speaker-profile')){
 const body=profile.querySelector('.speaker-profile-body');if(!body)continue;
 const slug=profile.id.replace(/^speaker-/,''),prefix=profile.querySelector('.speaker-panel')?.id.replace(/-bio$/,'')||slug;
 const panel=node('details',null,body);panel.className='speaker-panel';panel.name=prefix+'-profile-panels';panel.id=prefix+'-comments';
 node('summary','تعليقات وأسئلة الزوّار',panel);const content=node('div',null,panel);content.className='speaker-panel-body speaker-comments';
 node('p','تُراجع المشاركات قبل نشرها. يظهر اسمك ومشاركتك للعامة بعد الاعتماد؛ تجنّب إدراج بيانات شخصية أو وسائل تواصل داخل النص.',content);
 const published=node('div',null,content);published.setAttribute('aria-live','polite');
 const form=node('form',null,content);form.className='speaker-comment-form';
 function field(label,type,max){const l=node('label',label,form),input=node(type==='textarea'?'textarea':'input',null,l);if(type!=='textarea')input.type=type;input.required=true;input.maxLength=max;return input;}
 const name=field('الاسم الذي سيظهر للزوار','text',80);name.autocomplete='name';
 const kl=node('label','نوع المشاركة',form),kind=node('select',null,kl);for(const [v,t] of Object.entries(kinds)){const o=node('option',t,kind);o.value=v;}
 const text=field('نص المشاركة','textarea',2000);text.rows=5;text.minLength=5;
 const trap=field('اترك هذا الحقل فارغًا','text',100);trap.required=false;trap.parentElement.hidden=true;trap.tabIndex=-1;trap.autocomplete='off';
 const send=node('button','إرسال للمراجعة',form);send.type='submit';send.className='btn';const status=node('p',null,form);status.setAttribute('role','status');
 const admin=node('div',null,content);admin.hidden=true;let loaded=false;
 const ref=collection(db,'speakerComments',slug,'messages');
 function renderMessage(item,parent,review){
  const box=node('article',null,parent);box.className='speaker-comment';node('strong',item.data.name+' · '+(kinds[item.data.kind]||'مشاركة'),box);
  const dt=item.data.createdAt?.toDate?.();if(dt)node('small',' · '+dt.toLocaleDateString('ar-BH'),box);
  node('p',item.data.text,box);
  if(item.data.reply){node('strong','رد إدارة المنتدى',box);node('p',item.data.reply,box);}
  if(!moderator())return;
  const actions=node('div',null,box);
  async function change(fields){for(const b of actions.querySelectorAll('button'))b.disabled=true;try{await updateDoc(doc(ref,item.id),{...fields,updatedAt:serverTimestamp()});await load();}catch{node('p','تعذّر حفظ الإجراء. تحقق من الصلاحية والاتصال.',box);}finally{for(const b of actions.querySelectorAll('button'))b.disabled=false;}}
  if(review){const approve=node('button','اعتماد ونشر',actions);approve.type='button';approve.onclick=()=>change({state:'approved'});}
  const hide=node('button',review?'عدم النشر':'إخفاء المشاركة',actions);hide.type='button';hide.onclick=()=>change({state:'hidden'});
  if(!review){const l=node('label','رد إدارة المنتدى',actions),reply=node('textarea',null,l);reply.maxLength=2000;reply.rows=3;reply.value=item.data.reply||'';const save=node('button','حفظ الرد',actions);save.type='button';save.onclick=()=>change({reply:reply.value.trim(),replyRole:'administration'});}
 }
 async function load(){
  published.replaceChildren();node('p','جارٍ تحميل المشاركات…',published);admin.replaceChildren();admin.hidden=!moderator();
  try{const snap=await getDocs(query(ref,where('state','==','approved'),limit(100)));published.replaceChildren();
   const rows=snap.docs.map(d=>({id:d.id,data:d.data()})).sort((a,b)=>(b.data.createdAt?.seconds||0)-(a.data.createdAt?.seconds||0));
   if(!rows.length)node('p','لا توجد مشاركات منشورة بعد. كن أول من يشارك.',published);for(const item of rows)renderMessage(item,published,false);
   if(moderator()){node('h4','مشاركات بانتظار مراجعتك',admin);const pending=await getDocs(query(ref,where('state','==','pending'),limit(100)));if(pending.empty)node('p','لا توجد مشاركات بانتظار المراجعة.',admin);for(const d of pending.docs)renderMessage({id:d.id,data:d.data()},admin,true);}
   loaded=true;
  }catch{published.replaceChildren();node('p','تعذّر تحميل المشاركات. أعد فتح هذا القسم للمحاولة.',published);loaded=false;}
 }
 panel.addEventListener('toggle',()=>{if(panel.open&&!loaded)load();});
 onAuthStateChanged(auth,()=>{loaded=false;admin.replaceChildren();admin.hidden=true;if(panel.open)load();});
 const opened=Date.now();form.onsubmit=async e=>{e.preventDefault();if(trap.value)return;
  let last=0;try{last=Number(localStorage.getItem('forum-speaker-comment-last')||0);}catch{}
  if(Date.now()-last<60000||Date.now()-opened<3000){status.textContent='يرجى الانتظار قليلًا قبل إرسال مشاركة أخرى.';return;}
  const n=name.value.trim(),t=text.value.trim();if(!n||t.length<5){status.textContent='أدخل الاسم ومشاركة من خمسة أحرف على الأقل.';return;}
  send.disabled=true;status.textContent='جارٍ إرسال المشاركة…';
  try{await setDoc(doc(ref),{name:n,kind:kind.value,text:t,state:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),reply:'',replyRole:''});try{localStorage.setItem('forum-speaker-comment-last',String(Date.now()));}catch{}form.reset();status.textContent='تم استلام مشاركتك، وستظهر بعد مراجعة إدارة المنتدى واعتمادها.';loaded=false;if(moderator())load();}
  catch{status.textContent='تعذّر إرسال المشاركة. تحقق من الاتصال ثم أعد المحاولة.';}finally{send.disabled=false;}
 };
}
