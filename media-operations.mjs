import {plans} from './media-plans.mjs';

const committee = 'media';
const roles = {manager:'مسؤول اللجنة', deputy:'نائب المسؤول', lead:'قائد فريق', member:'عضو', observer:'اللجنة العليا'};
const stages = {
  idea:'فكرة جديدة', preparation:'قيد الإعداد', production:'قيد الإنتاج', review:'قيد المراجعة',
  changes:'مطلوب تعديل', completed:'معتمد الإنجاز', approved:'معتمد للنشر', scheduled:'مجدول', published:'منشور',
  archived:'مؤرشف', paused:'متوقف', cancelled:'ملغى'
};
const planStates = {proposed:'مقترحة', considering:'قيد الدراسة', deferred:'مؤجلة', accepted:'معتمدة'};
const priorities = {normal:'عادية', high:'عالية', urgent:'عاجلة'};
const areas = {
  editorial:'التحرير والمحتوى', visual:'الإنتاج المرئي', design:'التصميم والهوية',
  platforms:'النشر والمنصات', archive:'التوثيق والأرشفة', field:'التغطيات الميدانية'
};

const teamScopes = {
  editorial:'الأخبار، السيناريوهات، التدقيق والتحرير',
  visual:'التصوير، المقابلات، المونتاج',
  design:'التصاميم، الإنفوغرافيك، قوالب النشر',
  platforms:'إنستغرام، يوتيوب، واتساب، الموقع الذكي',
  archive:'حفظ المواد، تنظيم الملفات، الفهرسة',
  field:'تغطية الفعاليات، المقابلات الميدانية، التنسيق'
};

const planTasks = {
  workPlan: [
    ['إعداد تقويم النشر الأسبوعي', 'ربط المواد الجاهزة بمواعيد النشر على كل منصة ومراعاة أولوية المستجدات.', 'platforms'],
    ['إعداد التقرير العام للمنتدى', 'جمع المواد المعتمدة وتحرير التقرير العام وتوثيق حضور الجهات الرسمية.', 'editorial'],
    ['تجهيز حزمة متحدث', 'فيديو كامل وريلز وكاروسل وملخص وملف معتمد، وإضافة أسئلة الجمهور عند توفر الإجابات.', 'editorial'],
    ['إعداد سلسلة شخصيات صنعت الأثر', 'جمع الصور وأسباب التكريم وإعداد المادة للمراجعة والنشر.', 'editorial'],
    ['توثيق تجربة متطوع', 'اختيار موضوع المقابلة والحصول على الموافقة وتوثيق المساهمة.', 'field'],
    ['أرشفة المادة المنشورة', 'ربط النسخة المعتمدة ومواد المصدر وروابط المنشورات بسجل المادة.', 'archive']
  ],
  coveragePlan: [
    ['إعداد قائمة لقطات التغطية', 'حصر الفقرات والمواقع واللقطات المطلوبة وتحديد المصورين ومواعيد تسليم المواد.', 'field'],
    ['جمع مواد التغطية والتصريحات', 'حصر التسجيل الأصلي والصور ومواد الجمعيات والتحقق من الإذن بالاستخدام.', 'field'],
    ['إنتاج تقرير كلمة الوزير', 'اختيار مقتطفات موثقة من الكلمة ومراجعة الاقتباسات مع فريق التحرير.', 'visual'],
    ['إجراء مقابلات ميدانية', 'تجهيز الأسئلة وتنسيق المواعيد وتوثيق الموافقات وتسليم التسجيلات.', 'field'],
    ['إنتاج ريلز صوتي تجريبي', 'إعداد نص لمدة 60–90 ثانية ومزج التعليق مع الأصوات والمشاهد الأصلية.', 'visual'],
    ['تسليم مواد التغطية للأرشيف', 'فهرسة المواد الخام والنسخ المعتمدة بحسب الفعالية وتسجيل روابط النشر.', 'archive']
  ]
};

function element(tag, value, parent) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  parent?.append(node);
  return node;
}

function action(parent, label, handle) {
  const button = element('button', label, parent);
  button.type = 'button';
  button.className = 'btn secondary';
  button.onclick = handle;
  return button;
}

function field(parent, name, label, type = 'text', required = false, value = '') {
  const wrapper = element('label', label, parent);
  let control;
  if (typeof type === 'object') {
    control = element('select', '', wrapper);
    for (const [key, caption] of Object.entries(type)) {
      const option = element('option', caption, control);
      option.value = key;
    }
  } else {
    control = element(type === 'textarea' ? 'textarea' : 'input', '', wrapper);
    if (type !== 'textarea') control.type = type;
  }
  control.name = name;
  control.required = required;
  if (name === 'uid') control.pattern = '[A-Za-z0-9_\\-]+';
  if (type === 'number') {
    control.min = 0;
    control.max = name === 'progress' ? 100 : 500;
  }
  control.maxLength = name === 'title' ? 200 : name === 'uid' ? 128 : 2000;
  if (value !== '' || control.tagName !== 'SELECT' || Object.hasOwn(type, '')) control.value = value ?? '';
  return control;
}

const definitions = {
  teams: {
    title:'الفرق والهيكل التنظيمي',
    fields:[
      ['title','اسم الفريق','text',true], ['description','الوصف والأهداف','textarea'], ['units','الوحدات والاختصاصات'],
      ['leader','اسم القائد ونائبه'], ['skills','المؤهلات والتخصصات الناقصة'], ['minimum','الحد الأدنى','number',true],
      ['target','العدد المستهدف','number',true], ['state','الحالة',{proposed:'مقترح',forming:'قيد التأسيس',active:'نشط',paused:'متوقف'}]
    ]
  },
  members: {
    title:'الأعضاء والأدوار',
    fields:[
      ['email','البريد الإلكتروني لحساب Google','email',true], ['title','اسم العرض','text',true],
      ['role','صلاحية النظام',{manager:roles.manager,deputy:roles.deputy,lead:roles.lead,member:roles.member}],
      ['teamId','الفريق الأساسي'], ['primaryRole','الدور الأساسي'], ['supportRoles','الفرق والأدوار المساندة'],
      ['skills','المهارات ومستوياتها'], ['availability','التفرّغ'],
      ['state','الحالة',{active:'معتمد ونشط',inactive:'غير نشط',training:'متدرب'}]
    ]
  },
  content: {
    title:'المحتوى والأرشيف',
    fields:[
      ['title','عنوان المادة','text',true], ['category','التصنيف',{speaker:'متحدثون',honorees:'تكريم',volunteer:'متطوعون',news:'أخبار',partnership:'شراكات',report:'تقارير',updates:'مستجدات',recommendation:'أخبار التوصيات المعتمدة'}],
      ['format','نوع المادة',{reel:'ريلز',carousel:'كاروسل',image:'صورة',story:'ستوري',video:'فيديو كامل',web:'تقرير ويب',audio:'تقرير صوتي'}],
      ['description','الهدف والجمهور','textarea'], ['taskId','مهمة الإنتاج'], ['fileUrl','رابط النسخة أو المجلد','url']
    ]
  },
  publications: {
    title:'تقويم النشر',
    fields:[
      ['contentId','المادة الإعلامية','text',true], ['platform','المنصة',{instagram:'إنستغرام',youtube:'يوتيوب',whatsapp:'واتساب',website:'الموقع الذكي'}],
      ['date','موعد النشر بتوقيت البحرين','datetime-local',true], ['state','الحالة',{scheduled:'مجدول',published:'منشور',cancelled:'ملغى'}],
      ['fileUrl','رابط المنشور النهائي','url']
    ]
  }
};

export function mountOperations(root, db, sdk, user) {
  root.hidden = false;
  let stopped = false;
  let renderId = 0;
  const uid = user.uid;
  const path = (group, id) => sdk.doc(db, 'forumCommittees', committee, group, id);
  const collection = group => sdk.collection(db, 'forumCommittees', committee, group);
  const read = async (group, id) => {
    const snapshot = await sdk.getDocFromServer(path(group, id));
    return snapshot.exists() ? {id:snapshot.id, ...snapshot.data()} : null;
  };
  const list = async (group, criteria) => {
    const query = criteria ? sdk.query(collection(group), sdk.where(...criteria)) : collection(group);
    return (await sdk.getDocsFromServer(query)).docs.map(record => ({id:record.id, ...record.data()}));
  };

  async function save(group, record, values, assigneeName) {
    const ref = record?.id ? path(group, record.id) : sdk.doc(collection(group));
    const log = sdk.doc(collection('audit'));
    await sdk.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists() !== Boolean(record?.existing || record?.updatedAt)
          || (snapshot.exists() && (snapshot.data().updatedAt ? !snapshot.data().updatedAt.isEqual(record.updatedAt) : Boolean(record.updatedAt)))) {
        throw new Error('stale-record');
      }
      const payload = {...Object.fromEntries(Object.entries(values).filter(([,value]) => value !== undefined)), updatedAt:sdk.serverTimestamp()};
      payload.auditId = log.id;
      transaction.set(log, {
        actorId:uid, group, targetId:ref.id, operation:snapshot.exists() ? 'update' : 'create',
        timestamp:sdk.serverTimestamp()
      });
      transaction.set(ref, payload, {merge:snapshot.exists()});
      const task = {...snapshot.data(), ...payload};
      if (group === 'tasks' && task.planState === 'accepted') {
        const {title, teamId, assigneeId, start, due, state, progress, updatedAt} = task;
        transaction.set(path('taskSummaries', ref.id), {
          title, teamId, assigneeId, assigneeName, start, due, state, progress, updatedAt
        });
      }
    });
  }

  async function activateMembership() {
    const membership = await read('members', uid);
    if (membership || !user.emailVerified || !user.email) return membership;
    const invitation = path('memberInvites', user.email);
    const member = path('members', uid);
    await sdk.runTransaction(db, async transaction => {
      const [existing, pending] = await Promise.all([transaction.get(member), transaction.get(invitation)]);
      if (existing.exists() || !pending.exists() || pending.data().claimedUid) return;
      const updatedAt = sdk.serverTimestamp();
      transaction.set(member, {...pending.data().profile, updatedAt, auditId:''});
      transaction.update(invitation, {claimedUid:uid, updatedAt});
    });
    return read('members', uid);
  }

  let membershipReady;

  async function render(tab = 'home') {
    if (stopped) return;
    const current = ++renderId;
    root.replaceChildren();
    const feedback = element('p', 'جارٍ تحميل مساحة اللجنة…', root);
    feedback.setAttribute('role', 'status');
    try {
      const [membership, upper] = await Promise.all([membershipReady ??= activateMembership(), read('oversight', uid)]);
      if (stopped || current !== renderId) return;
      feedback.textContent = '';
      const role = membership?.state === 'active' ? membership.role : upper?.state === 'active' ? 'observer' : null;
      const manager = role === 'manager';
      const operator = manager || role === 'deputy';
      const lead = role === 'lead';
      const summaryCriteria = operator || role === 'observer' ? null : ['teamId','==',membership?.teamId ?? ''];
      const tasksTabs = role === 'observer' ? {teamTasks:'مهام اللجنة'} : {
        tasks:'مهامي', teamTasks:'مهام الفريق',
        ...(operator ? {allTasks:'مهام اللجنة'} : {}),
        ...(operator || lead ? {review:'بانتظار المراجعة'} : {})
      };
      const planTabs = {workPlan:'خطة عمل اللجنة', coveragePlan:'خطة التغطية الإعلامية'};
      const moreTabs = {teams:'الفرق', content:'المحتوى والأرشيف'};
      const adminTabs = {
        ...(operator || lead ? {members:definitions.members.title} : {}),
        ...(operator ? {publications:'إدارة مواعيد النشر'} : {}),
        ...(manager ? {audit:'سجل العمليات'} : {})
      };
      const tabs = {home:'نظرة عامة', ...(role ? {
        ...tasksTabs,...planTabs,committeeCalendar:'التقويم',...moreTabs,...adminTabs
      } : {})};
      if (!Object.hasOwn(tabs,tab)) tab = 'home';
      const nav = element('nav', '', root);
      nav.setAttribute('aria-label', 'أقسام اللجنة');
      const tree = element('ul','',nav);
      tree.className = 'forum-tree org-tree media-tree';
      const panel = element('div','');
      panel.className = 'org-branch media-panel';
      function leaf(list,key,label) {
        const branch = element('details','',element('li','',list));
        const summary = element('summary',label,branch);
        if (key === tab) {
          branch.open = true;
          summary.setAttribute('aria-current','page');
          branch.append(panel);
        } else {
          summary.onclick = async event => {
            event.preventDefault();
            await render(key);
            root.querySelector('[aria-current="page"]')?.focus();
          };
        }
      }
      function group(label,items) {
        if (!Object.keys(items).length) return;
        const branch = element('details','',element('li','',tree));
        element('summary',label,branch);
        branch.open = Object.hasOwn(items,tab);
        const children = element('ul','',branch);
        for (const [key,title] of Object.entries(items)) leaf(children,key,title);
      }
      leaf(tree,'home',tabs.home);
      if (role) {
        group('المهام',tasksTabs);
        group('الخطط',planTabs);
        leaf(tree,'committeeCalendar',tabs.committeeCalendar);
        group('الفرق والمحتوى',moreTabs);
        group('إدارة اللجنة',adminTabs);
      }
      const bylaws = document.getElementById('media-bylaws-branch')?.cloneNode(true);
      if (bylaws) {
        bylaws.removeAttribute('id');
        tree.append(bylaws);
      }
      const status = element('p', '', panel);
      status.setAttribute('role', 'status');
      function form(fields, values, onSave, label = 'حفظ', container = panel) {
        const editor = element('form', '', container);
        for (const [name, caption, type, required] of fields) field(editor, name, caption, type, required, values?.[name]);
        const submit = element('button', label, editor);
        submit.className = 'btn primary';
        editor.onsubmit = async event => {
          event.preventDefault();
          submit.disabled = true;
          const input = Object.fromEntries(new FormData(editor));
          for (const key of Object.keys(input)) {
            input[key] = editor.elements.namedItem(key).type === 'number' ? Number(input[key]) : input[key].trim();
          }
          try {
            await onSave(input, event.submitter);
            if (stopped || current !== renderId) return;
            await render(tab);
            root.querySelector('[aria-current="page"]')?.focus();
          } catch (error) {
            status.textContent = error.message === 'review-note' ? 'اكتب التعديل المطلوب قبل إرجاع المهمة.' : error.message === 'date-order' ? 'يجب أن يسبق تاريخ البدء تاريخ الانتهاء أو يوافقه.' : error.message === 'stale-record'
              ? 'تغيّر السجل بعد فتحه. انسخ تعديلاتك ثم أعد فتح السجل.'
              : 'تعذّر الحفظ. تحقق من المدخلات والصلاحية والاتصال.';
          } finally {
            submit.disabled = false;
          }
        };
        return editor;
      }

      function showLink(item, url) {
        if (!/^https?:\/\//i.test(url ?? '')) return;
        const link = element('a', 'فتح الرابط', item);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      function records(rows, describe, edit, container = panel) {
        const search = field(container, 'filter', 'تصفية السجلات', 'search');
        const list = element('ul', '', container);
        function draw() {
          list.replaceChildren();
          for (const row of rows) {
            const view = describe(row);
            if (!view.join(' ').includes(search.value.trim())) continue;
            const item = element('li', '', list);
            element('strong', view[0], item);
            for (const detail of view.slice(1)) if (detail) element('p', detail, item);
            showLink(item, row.fileUrl ?? row.portfolio);
            if (edit) action(item, 'فتح السجل', () => edit(row));
          }
          if (!list.children.length) element('li', 'لا توجد سجلات مطابقة.', list);
        }
        search.oninput = draw;
        draw();
        return list;
      }

      if (tab === 'home') {
        element('p', role ? 'الصلاحية · ' + roles[role] : 'لم تُفعّل عضوية هذا الحساب. تواصل مع إدارة اللجنة لاعتماد بريد حساب Google أدناه.', panel);
        if (!role && user.email) element('p', user.email, panel);
        if (membership) element('p', membership.title + ' · ' + (membership.primaryRole || 'الدور قيد التحديد'), panel);
        if (role) {
          const [tasks, entries, content] = await Promise.all([
            list('taskSummaries', summaryCriteria), list('publications'), list('content')
          ]);
          if (stopped || current !== renderId) return;
          const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bahrain'}).format(new Date());
          const open = tasks.filter(row => !['completed','published','archived','cancelled'].includes(row.state));
          const reviewing = operator || lead;
          const items = (reviewing ? open.filter(row => row.state === 'review' && (operator || row.assigneeId !== uid))
            : role === 'observer' ? open : open.filter(row => row.assigneeId === uid))
            .sort((a,b) => a.due.localeCompare(b.due)).slice(0,3);
          const upcoming = entries.filter(row => row.state === 'scheduled' && row.date.slice(0,10) >= today)
            .sort((a,b) => a.date.localeCompare(b.date)).slice(0,3);
          const overview = element('div','',panel);
          overview.className = 'media-home-grid';
          const work = element('section','',overview);
          element('h4',reviewing ? 'بانتظار المراجعة' : role === 'observer' ? 'العمل الجاري' : 'مهامي القادمة',work);
          if (items.length) {
            const list = element('ul','',work);
            for (const row of items) element('li',row.title+' · '+row.due,list);
          } else element('p',reviewing ? 'لا توجد مهام بانتظار المراجعة.' : 'لا توجد مهام مفتوحة.',work);
          action(work,'عرض المهام',() => render(reviewing ? 'review' : Object.keys(tasksTabs)[0]));
          const calendar = element('section','',overview);
          element('h4','مواعيد النشر القادمة',calendar);
          if (upcoming.length) {
            const list = element('ul','',calendar);
            for (const row of upcoming) element('li',(content.find(item => item.id === row.contentId)?.title ?? 'مادة إعلامية')+' · '+row.date.replace('T',' '),list);
          } else element('p','لا توجد مواعيد نشر قادمة.',calendar);
          action(calendar,'فتح التقويم',() => render('committeeCalendar'));
        }
        return;
      }

      function taskCriteria() {
        if (operator) return null;
        return lead ? ['teamId','==',membership.teamId] : ['assigneeId','==',uid];
      }

      const planView = Object.hasOwn(plans, tab);
      const taskView = ['tasks','allTasks','review','teamTasks','committeeCalendar'].includes(tab);
      if (planView || taskView) {
        const summaries = await list('taskSummaries', summaryCriteria);
        if (stopped || current !== renderId) return;
        const teams = operator ? await list('teams') : [];
        const members = operator ? (await list('members')).filter(member => member.state === 'active') : [];
        const teamOptions = {'':'اختر الفريق', ...Object.fromEntries(teams.map(team => [team.id,team.title]))};
        const memberOptions = {'':'اختر المسؤول', ...Object.fromEntries(members.map(member => [member.id,member.title]))};
        const priorityField = ['priority','الأولوية',priorities,true];
        const progressField = ['progress','نسبة الإنجاز','number',true];

        function taskEditor(container, row, preset = {}) {
          const isAssigned = row?.planState === 'accepted';
          const canReview = row?.state === 'review' && (operator || (lead && row.assigneeId !== uid));
          const assigneeName = row?.assigneeId === uid ? membership?.title : summaries.find(item => item.id === row?.id)?.assigneeName;
          if (canReview) {
            form([
              ['state','قرار المراجعة',{completed:'اعتماد الإنجاز',changes:'إعادة للتعديل'},true],
              ['reviewNote','ملاحظة المراجعة','textarea']
            ], {}, values => {
              if (values.state === 'changes' && !values.reviewNote) throw new Error('review-note');
              return save('tasks', row, {
                ...values, progress:values.state === 'completed' ? 100 : row.progress
              }, assigneeName);
            }, 'حفظ قرار المراجعة', container);
            return;
          }
          if (!operator) {
            if (!isAssigned || row.assigneeId !== uid || !['idea','preparation','production','changes'].includes(row.state)) return;
            form([
              progressField, ['note','ملاحظات التنفيذ','textarea'], ['fileUrl','رابط مخرجات العمل','url'],
              ['state','الإجراء',{production:'حفظ التقدم',review:'إرسال للمراجعة'},true]
            ], {...row,state:'production'}, values => save('tasks', row, values, assigneeName), 'حفظ التحديث', container);
            return;
          }
          const base = {
            title:'',description:'',project:'',teamId:'',assigneeId:'',contributors:'',
            priority:'normal',due:'',start:'',progress:0,planState:'proposed',state:'idea',
            fileUrl:'',note:'',reviewNote:'',...preset,...row
          };
          const fields = [
            ['title','العنوان','text',true], ['description','الوصف والناتج المطلوب','textarea'],
            priorityField, ['planState','حالة البند',isAssigned ? {accepted:planStates.accepted} : planStates,true]
          ];
          const assignment = [
            ['teamId','الفريق',teamOptions,true], ['assigneeId','المسؤول',memberOptions,true],
            ['contributors','المساهمون'], ['start','تاريخ البدء','date',true], ['due','تاريخ الانتهاء','date',true],
            progressField, ['fileUrl','رابط مخرجات العمل','url'], ['note','ملاحظات التنفيذ','textarea']
          ];
          const execution = isAssigned && ['completed','approved','scheduled','published','archived'].includes(row.state)
            ? Object.fromEntries(Object.entries(stages).filter(([key]) => [row.state,'approved','scheduled','published','archived'].includes(key)))
            : {preparation:'قيد الإعداد',production:'قيد الإنتاج',review:'إرسال للمراجعة'};
          const editor = form([...fields,...assignment,['state','مرحلة التنفيذ',execution,true]], {
            ...base, state:Object.hasOwn(execution,base.state) ? base.state : 'preparation'
          }, values => {
            const accepted = values.planState === 'accepted';
            if (accepted && values.start > values.due) throw new Error('date-order');
            const selected = members.find(member => member.id === values.assigneeId);
            return save('tasks', row ?? (preset.id ? {id:preset.id} : null), {
              ...base,...values,...(accepted ? {} : {state:'idea',start:'',due:'',teamId:'',assigneeId:'',progress:0}),
              ...(accepted && base.state === 'changes' && values.state !== 'review' ? {state:'production'} : {}),
              id:undefined,updatedAt:undefined,auditId:undefined
            }, selected?.title);
          }, 'حفظ البند', container);
          function updateAssignment() {
            const accepted = editor.elements.planState.value === 'accepted';
            for (const [name,, ,required] of [...assignment,['state','','',true]]) {
              const input = editor.elements.namedItem(name);
              input.disabled = !accepted;
              input.required = accepted && Boolean(required);
              input.parentElement.hidden = !accepted;
            }
            const teamId = editor.elements.teamId.value;
            for (const option of editor.elements.assigneeId.options) {
              option.disabled = Boolean(option.value) && members.find(member => member.id === option.value)?.teamId !== teamId;
            }
            if (editor.elements.assigneeId.selectedOptions[0]?.disabled) editor.elements.assigneeId.value = '';
          }
          editor.elements.planState.onchange = editor.elements.teamId.onchange = updateAssignment;
          updateAssignment();
        }

        if (planView) {
          const privateRows = operator ? await list('tasks') : [];
          for (const [index, [title,description,teamId]] of planTasks[tab].entries()) {
            const id = tab + '-' + (index + 1);
            const row = privateRows.find(item => item.id === id);
            const summary = summaries.find(item => item.id === id);
            const details = element('details', '', panel);
            element('summary', (row?.title ?? summary?.title ?? title) + ' · ' +
              planStates[row?.planState ?? (summary ? 'accepted' : 'proposed')] +
              (row ? ' · ' + priorities[row.priority] : ''), details);
            element('p', description, details);
            if (operator) taskEditor(details, row, {id,title,description,teamId,project:tabs[tab]});
          }
          for (const [id, section] of Object.entries(plans[tab])) {
            const details = element('details', '', panel);
            details.id = id;
            element('summary', section.title, details);
            element('div', '', details).innerHTML = section.body;
            details.open = location.hash.slice(1) === id;
          }
          return;
        }
        if (tab === 'committeeCalendar') {
          const type = field(panel,'calendarType','نوع الموعد',{all:'جميع المواعيد',tasks:'تسليم المهام',publications:'النشر'});
          const mode = field(panel,'period','العرض',{upcoming:'القادم',week:'أسبوع',month:'شهر'});
          const day = field(panel,'date','بداية الفترة','date');
          day.value = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bahrain'}).format(new Date());
          const publications = await list('publications');
          const content = await list('content');
          const calendar = element('div','',panel);
          function draw() {
            calendar.replaceChildren();
            const start = day.value;
            const end = mode.value === 'week' && start
              ? new Date(Date.parse(start+'T00:00:00Z') + 6*86400000).toISOString().slice(0,10)
              : mode.value === 'month' ? start.slice(0,7)+'-31' : '9999-12-31';
            const from = mode.value === 'month' ? start.slice(0,7)+'-01' : start;
            const rows = [
              ...summaries.filter(row => type.value !== 'publications' && row.due >= from && row.due <= end && row.state !== 'cancelled').map(row =>
                [row.due,'تسليم · '+row.title,row.start+' — '+row.due+' · '+row.assigneeName+' · '+stages[row.state]+' · '+row.progress+'٪']),
              ...publications.filter(row => type.value !== 'tasks' && row.state !== 'cancelled' && row.date.slice(0,10) >= from && row.date.slice(0,10) <= end)
                .map(row => [row.date,'نشر · '+(content.find(item => item.id === row.contentId)?.title ?? 'مادة إعلامية'),row.date.replace('T',' · ')])
            ].sort((a,b) => a[0].localeCompare(b[0]));
            records(rows, row => row.slice(1), null, calendar);
          }
          mode.onchange = day.onchange = type.onchange = draw;
          draw();
          return;
        }
        if (tab === 'teamTasks') {
          records(summaries.filter(row => operator || role === 'observer' || row.teamId === membership.teamId),
            row => [row.title,row.assigneeName,row.due,stages[row.state],row.progress+'٪']);
          return;
        }
        const rows = ['review','allTasks'].includes(tab) ? await list('tasks',taskCriteria()) : await list('tasks',['assigneeId','==',uid]);
        if (operator && tab === 'allTasks') {
          const newTask = element('details','',panel);
          element('summary','إضافة بند أو مهمة',newTask);
          taskEditor(newTask);
        }
        const visible = tab === 'review' ? rows.filter(row => row.state === 'review' && (operator || row.assigneeId !== uid)) : rows;
        if (!visible.length) element('p','لا توجد مهام في هذه القائمة.',panel);
        for (const row of visible) {
          const details = element('details','',panel);
          element('summary',row.title+' · '+stages[row.state]+' · '+(row.progress ?? 0)+'٪',details);
          for (const value of [row.description,row.due,row.note,row.reviewNote]) if (value) element('p',value,details);
          showLink(details,row.fileUrl);
          taskEditor(details,row);
        }
        return;
      }

      if (tab === 'audit') {
        const query = sdk.query(collection('audit'), sdk.orderBy('timestamp','desc'), sdk.limit(50));
        const snapshot = await sdk.getDocsFromServer(query);
        records(snapshot.docs.map(row => row.data()), row => [row.group + ' · ' + row.operation,
          row.timestamp?.toDate().toLocaleString('ar-BH',{timeZone:'Asia/Bahrain'}), row.targetId, row.actorId]);
        return;
      }

      const criteria = tab === 'members' && lead ? ['teamId','==',membership.teamId] : null;
      const rows = await list(tab, criteria);
      const teams = tab === 'members' ? await list('teams') : [];
      const members = tab === 'teams' && operator ? await list('members') : [];
      const content = tab === 'publications' ? await list('content') : [];
      const tasks = tab === 'content' && operator ? await list('tasks') : [];
      if (stopped || current !== renderId) return;
      const definition = definitions[tab];
      const invitations = tab === 'members' && manager ? await list('memberInvites') : [];
      if (stopped || current !== renderId) return;
      const canCreate = tab === 'members' ? manager : operator;
      const canEdit = canCreate;
      const options = (items, empty = 'اختر') => ({'':empty,...Object.fromEntries(items.map(row => [row.id,row.title]))});
      const linked = {
        teamId:options(teams, 'غير محدد'),
        contentId:options(content), taskId:options(tasks, 'غير مرتبط')
      };
      let activeForm;
      function edit(row, pending = false) {
        activeForm?.remove();
        const fields = definition.fields.filter(([name]) => {
          if (row && name === 'email') return false;
          return canCreate;
        }).map(([name, title, type, required]) => [
          name,title,linked[name] ?? type,required
        ]);
        const initial = pending ? row.profile : row ?? (tab === 'members' ? {role:'member',state:'active'} : null);
        activeForm = form(fields, initial, async values => {
          if (tab !== 'members' || (row && !pending)) {
            return save(tab, row ? {...row,existing:true} : null, values);
          }
          const email = row?.id ?? values.email.trim().toLowerCase();
          delete values.email;
          const ref = path('memberInvites', email);
          await sdk.runTransaction(db, async transaction => {
            const currentInvite = await transaction.get(ref);
            if (currentInvite.exists() !== pending ||
                (pending && !currentInvite.data().updatedAt.isEqual(row.updatedAt))) throw new Error('stale-record');
            transaction.set(ref, {profile:values,claimedUid:'',updatedAt:sdk.serverTimestamp()});
          });
        });
        activeForm.querySelector('input,select,textarea')?.focus();
      }
      if (canCreate) action(panel, tab === 'members' ? 'إضافة عضو بالبريد' : 'إضافة سجل', () => edit());
      if (invitations.some(invite => !invite.claimedUid)) {
        element('h4','بانتظار أول دخول',panel);
        records(invitations.filter(invite => !invite.claimedUid),
          invite => [invite.profile.title,invite.id,roles[invite.profile.role]], invite => edit(invite,true));
      }
      if (tab === 'teams' && operator) {
        for (const [id, name] of Object.entries(areas)) {
          if (rows.some(row => row.id === id)) continue;
          action(panel, 'إعداد فريق ' + name, () => {
            activeForm?.remove();
            activeForm = form(definition.fields, {title:name,units:teamScopes[id],state:'proposed',minimum:0,target:0},
              values => save('teams', {id}, values));
            activeForm.querySelector('input').focus();
          });
        }
      }
      if (tab === 'publications') {
        const mode = field(panel, 'period', 'عرض التقويم', {all:'جميع المواعيد',week:'أسبوع',month:'شهر'});
        const period = field(panel, 'date', 'الفترة', 'date');
        function bahrainDate() {
          return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bahrain'}).format(new Date());
        }
        period.value = bahrainDate();
        period.parentElement.hidden = true;
        rows.sort((a,b) => a.date.localeCompare(b.date));
        const calendar = element('div', '', panel);
        function drawCalendar() {
          period.type = mode.value === 'month' ? 'month' : 'date';
          if (!period.value) period.value = mode.value === 'month' ? bahrainDate().slice(0,7) : bahrainDate();
          period.parentElement.hidden = mode.value === 'all';
          const start = Date.parse(period.value + 'T00:00:00Z');
          const visible = rows.filter(row => {
            if (mode.value === 'all') return true;
            if (mode.value === 'month') return row.date.startsWith(period.value);
            const date = Date.parse(row.date.slice(0,10) + 'T00:00:00Z');
            return date >= start && date < start + 7 * 86400000;
          });
          calendar.replaceChildren();
          records(visible, row => [
            content.find(item => item.id === row.contentId)?.title ?? 'مادة إعلامية',
            row.date.replace('T',' · '), {instagram:'إنستغرام',youtube:'يوتيوب',whatsapp:'واتساب',website:'الموقع'}[row.platform],
            {scheduled:'مجدول',published:'منشور',cancelled:'ملغى'}[row.state], row.fileUrl
          ], canEdit ? edit : null, calendar);
        }
        mode.onchange = period.onchange = drawCalendar;
        drawCalendar();
        return;
      }
      records(rows, row => {
        if (tab === 'teams') {
          const approved = members.filter(member => member.teamId === row.id && member.state === 'active').length;
          return [row.title, row.description, row.units, row.leader, row.skills,
            operator ? 'المعتمدون ' + approved + ' · الشواغر ' + Math.max(0,row.target-approved) : '',
            'الحد الأدنى ' + row.minimum + ' · المستهدف ' + row.target];
        }
        if (tab === 'members') return [row.title, roles[row.role], row.primaryRole, row.supportRoles, row.skills, row.availability];
        return [row.title, row.description, row.fileUrl, tasks.find(task => task.id === row.taskId)?.title];
      }, canEdit ? edit : null);
    } catch (error) {
      if (stopped || current !== renderId) return;
      membershipReady = undefined;
      feedback.textContent = error.code === 'permission-denied'
        ? 'تعذّر فتح هذه البيانات بالصلاحيات الحالية.'
        : 'تعذّر تحميل البيانات. تحقق من الاتصال وأعد المحاولة.';
      action(root, 'إعادة المحاولة', () => render(tab));
    }
  }

  const initialView = new URLSearchParams(location.search).get('view');
  render(initialView ?? 'home');
  return () => {
    stopped = true;
    root.replaceChildren();
    root.hidden = true;
  };
}
