const actions = {
  note:'إضافة ملاحظة', assign:'اقتراح تكليف', reschedule:'تغيير الموعد',
  done:'تسجيل إنجاز', defer:'اقتراح تأجيل', agenda:'إدراج في الاجتماع القادم', decision:'توثيق قرار مُقرّ'
};
const groups = {
  done:'ما تم إنجازه', assign:'ما يحتاج متابعة', defer:'ما تم تأجيله',
  agenda:'بنود للمناقشة والقرار', note:'المستجدات', decision:'ما تم إقراره'
};
const initial = [
  ['005','أُرسلت دعوات الفريق الأكاديمي إلى متحدثي المنتدى السبعة.','done'],
  ['005','حصر الردود بعد 15 نوفمبر 2026 وتنسيق اللقاء التأسيسي.','assign'],
  ['001','تحديد أولويات البرنامج السنوي ومؤشراته.','agenda'],
  ['003','مراجعة مقترح الرئاسة الدورية بين الجمعيات.','agenda'],
  ['006','مراجعة التصور الأولي للجان والورش.','agenda']
];
const approverEmail = 'jaffernasheet@gmail.com';
function add(parent, tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}
function button(parent, label, run) {
  const control = add(parent,'button',label);
  control.type = 'button';
  control.className = 'btn secondary';
  control.onclick = run;
  return control;
}

export function mountMeeting(db, sdk, auth, authSdk) {
  const first = document.documentElement.dataset.section === 'meeting-01';
  const prefix = first ? 'meeting-first-' : 'meeting-';
  const root = document.getElementById(prefix + 'register');
  const status = document.getElementById(prefix + 'status');
  const login = document.getElementById(prefix + 'login');
  const logout = document.getElementById(prefix + 'logout');
  const col = name => sdk.collection(db,name);
  const doc = (name,id) => sdk.doc(db,name,id);
  const showError = () => {status.textContent = 'تعذّر إتمام العملية. تحقق من الاتصال والصلاحية.';};
  const topics = new Map([...document.querySelectorAll('#meeting-01 .meeting-topics > details')]
    .map(item => [item.id.split('-')[1].padStart(3,'0'),item]));
  const titles = new Map([...topics].map(([id,item]) => [
    id,item.querySelector('summary').lastChild.textContent.trim()
  ]));
  const badges = new Map();
  const controls = new Map();
  if (first) {
    for (const [id,topic] of topics) {
      badges.set(id,add(topic.querySelector('summary'),'span'));
      badges.get(id).className = 'meeting-state';
      controls.set(id,add(topic.querySelector('.detail'),'div'));
    }
  }

  function setStatus(id,state) {
    if (!first) return;
    topics.get(id).dataset.meetingState = state;
    badges.get(id).textContent = {
      none:'لم يُسجّل إجراء',progress:'قيد الإنجاز',done:'منجز'
    }[state];
  }

  let generation = 0;

  async function render(user) {
    const current = ++generation;
    root.replaceChildren();
    status.textContent = '';
    for (const [id,container] of controls) {
      container.replaceChildren();
      container.className = '';
      setStatus(id,id === '005' ? 'progress' : 'none');
    }
    login.hidden = Boolean(user);
    logout.hidden = !user;
    const approver = user?.emailVerified && user.email === approverEmail;
    const buckets = {};
    for (const [key,label] of Object.entries(groups)) {
      if (first) continue;
      const details = add(root,'details');
      details.className = 'card';
      add(details,'summary',label);
      buckets[key] = add(details,'ul');
    }
    const append = (group,id,description,owner,due,title = titles.get(id)) => {
      const item = add(buckets[group],'li');
      const details = add(item,'details');
      details.className = 'meeting-item';
      add(details,'summary',['البند ' + id,title].filter(Boolean).join(' · '));
      add(details,'p',description);
      if (owner) add(details,'p','المسؤول · ' + owner);
      if (due) add(details,'p','الموعد · ' + due);
      if (titles.has(id)) {
        const topic = document.getElementById('topic-' + Number(id));
        const context = topic?.querySelector('.detail > p');
        if (context) add(details,'p',context.textContent);
        add(details,'a','فتح المحور في محضر الاجتماع الأول').href =
          '?section=meeting-01#topic-' + Number(id);
      }
    };
    if (!first) initial.forEach(([id,description,group]) => append(group,id,description));
    try {
      if (!user?.emailVerified) {
        status.textContent = 'سجّل الدخول للاطلاع على التحديثات المعتمدة.';
        return;
      }
      const scope = await sdk.getDoc(doc('forumMeetingChairs',user.uid));
      const [entries, updates] = await Promise.all([
        sdk.getDocs(col('forumMeetingItems')), sdk.getDocs(col('forumMeetingUpdates'))
      ]);
      if (current !== generation) return;
      const itemTitles = new Map(titles);
      const newItems = first ? null : add(root,'ul');
      for (const item of entries.docs.sort((a,b)=>Number(a.id)-Number(b.id))) {
        itemTitles.set(item.id,item.data().title);
        if (first) continue;
        const row = add(newItems,'li','البند ' + item.id + ' · ' + item.data().title);
        row.id = 'item-' + item.id;
      }
      const states = {assign:'progress',decision:'progress',done:'done'};
      const orderedUpdates = [...updates.docs].sort((a,b) =>
        (a.data().reviewedAt?.seconds ?? 0) - (b.data().reviewedAt?.seconds ?? 0)
        || (a.data().reviewedAt?.nanoseconds ?? 0) - (b.data().reviewedAt?.nanoseconds ?? 0)
        || a.id.localeCompare(b.id));
      for (const item of orderedUpdates) {
        const row = item.data();
        if (first) {
          const container = controls.get(row.itemId);
          if (!container) continue;
          if (states[row.action]) setStatus(row.itemId,states[row.action]);
          container.className = 'meeting-item-controls';
          add(container,'p',['معتمد',actions[row.action],row.note,row.owner,row.due].filter(Boolean).join(' · '));
          continue;
        }
        append(row.action === 'reschedule' ? 'assign' : row.action,row.itemId,row.note,row.owner,row.due,itemTitles.get(row.itemId));
      }
      for (const key of Object.keys(buckets)) {
        if (!buckets[key].children.length) add(buckets[key],'li','لا توجد بنود مسجّلة.');
      }
      if (!approver && !scope?.exists()) return;
      if (approver) {
        button(root,'تحديد بنود رئيس لجنة',async () => {
          const uid = prompt('معرّف حساب رئيس اللجنة في Firebase')?.trim();
          if (!uid || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return;
          const ref = doc('forumMeetingChairs',uid);
          try {
            const prior = (await sdk.getDoc(ref)).data()?.itemIds ?? [];
            const input = prompt('أرقام البنود مفصولة بفاصلة. اتركها فارغة لإزالة التكليفات.',prior.join(','));
            if (input === null) return;
            const itemIds = [...new Set(input.split(/[,،]/).map(value=>value.trim()).filter(Boolean)
              .map(value=>value.padStart(3,'0')))];
            if (itemIds.some(id=>!itemTitles.has(id))) {
              status.textContent = 'تحقق من أرقام البنود المدخلة.';
              return;
            }
            await sdk.setDoc(ref,{itemIds});
            status.textContent = 'حُفظت البنود المخصصة لرئيس اللجنة.';
          } catch {showError();}
        });
        if (!first) button(root,'إضافة بند جديد',async () => {
          const title = prompt('عنوان البند الجديد')?.trim();
          if (!title) return;
          try {
            await sdk.runTransaction(db,async tx => {
              const counter = doc('forumMeetingSettings','counter');
              const next = ((await tx.get(counter)).data()?.last ?? 15) + 1;
              const id = String(next).padStart(3,'0');
              tx.set(doc('forumMeetingItems',id),{title,number:next});
              tx.set(counter,{last:next,itemId:id});
            });
            await render(user);
          } catch {showError();}
        });
      }
      const eligible = [...itemTitles].filter(([id]) => approver || scope.data().itemIds.includes(id));
      const forms = new Map();
      function proposalForm(parent, fixedId) {
        const form = add(parent,'form');
        form.className = 'meeting-proposal';
        const choices = fixedId ? null : add(add(form,'label','البند '),'select');
        if (choices) for (const [id,title] of eligible) add(choices,'option',id+' · '+title).value = id;
        const kind = add(add(form,'label','الإجراء '),'select');
        for (const [key,label] of Object.entries(actions)) add(kind,'option',label).value = key;
        const note = add(add(form,'label','التعليق والملاحظات أو مرجع القرار '),'textarea');
        note.required = true;
        note.maxLength = 2000;
        const owner = add(add(form,'label','المسؤول '),'input');
        owner.maxLength = 200;
        const due = add(add(form,'label','الموعد '),'input');
        due.type = 'date';
        kind.onchange = () => {owner.required = kind.value === 'assign'; due.required = kind.value === 'reschedule';};
        kind.onchange();
        const submit = add(form,'button','إرسال للاعتماد');
        submit.className = 'btn secondary';
        submit.disabled = !fixedId && !eligible.length;
        form.onsubmit = async event => {
          event.preventDefault();
          submit.disabled = true;
          try {
            await sdk.addDoc(col('forumMeetingProposals'),{
              itemId:fixedId ?? choices.value,action:kind.value,note:note.value.trim(),owner:owner.value.trim(),due:due.value,
              author:user.uid,state:'pending',createdAt:sdk.serverTimestamp()
            });
            await render(user);
            status.textContent = 'أُرسل المقترح للاعتماد.';
          } catch {showError(); submit.disabled = false;}
        };
        return row => {
          if (choices) choices.value = row.itemId;
          kind.value = row.action;
          note.value = row.note;
          owner.value = row.owner;
          due.value = row.due;
          kind.onchange();
          if (fixedId) topics.get(fixedId).open = true;
          note.focus();
        };
      }
      if (first) {
        for (const [id] of eligible) {
          const container = controls.get(id);
          if (!container) continue;
          container.className = 'meeting-item-controls';
          forms.set(id,proposalForm(container,id));
        }
      } else {
        const refill = proposalForm(root);
        for (const [id] of eligible) forms.set(id,refill);
      }
      if (!approver) {
        const own = await sdk.getDocs(sdk.query(col('forumMeetingProposals'),sdk.where('author','==',user.uid)));
        if (current !== generation) return;
        if (!first) add(root,'h3','مقترحاتي');
        for (const item of own.docs) {
          const row = item.data();
          const parent = first ? controls.get(row.itemId) : root;
          if (!parent) continue;
          const line = add(parent,'p',[row.itemId,row.note,{pending:'بانتظار الاعتماد',approved:'معتمد',returned:'أُعيد للتعديل'}[row.state],row.reason].filter(Boolean).join(' · '));
          if (row.state === 'returned' && forms.has(row.itemId)) {
            button(line,'تعديل وإعادة الإرسال',()=>forms.get(row.itemId)(row));
          }
        }
        return;
      }
      const pending = await sdk.getDocs(sdk.query(col('forumMeetingProposals'),sdk.where('state','==','pending')));
      if (current !== generation) return;
      if (!first) add(root,'h3','بانتظار الاعتماد');
      for (const item of pending.docs) {
        const row = item.data();
        const parent = first ? controls.get(row.itemId) : root;
        if (!parent) continue;
        const card = add(parent,'article');
        add(card,'p',['بانتظار الاعتماد',row.itemId,actions[row.action],row.note,row.owner,row.due].filter(Boolean).join(' · '));
        async function resolve(state) {
          const reason = state === 'returned' ? prompt('ملاحظة الإعادة للتعديل')?.trim() : '';
          if (state === 'returned' && !reason) return;
          try {
            await sdk.runTransaction(db,async tx => {
              if ((await tx.get(item.ref)).data()?.state !== 'pending') return;
              const reviewedAt = sdk.serverTimestamp();
              tx.update(item.ref,{state,reason,reviewedAt});
              if (state === 'approved') tx.set(doc('forumMeetingUpdates',item.id),{
                itemId:row.itemId,action:row.action,note:row.note,owner:row.owner,due:row.due,reviewedAt
              });
            });
            await render(user);
          } catch {showError();}
        }
        button(card,'اعتماد التحديث',()=>resolve('approved'));
        button(card,'إعادة للتعديل',()=>resolve('returned'));
      }
    } catch {if (current === generation) showError();}
  }
  login.onclick = () => authSdk.signInWithPopup(auth,new authSdk.GoogleAuthProvider()).catch(showError);
  logout.onclick = () => authSdk.signOut(auth).catch(showError);
  authSdk.onAuthStateChanged(auth,render,showError);
}
