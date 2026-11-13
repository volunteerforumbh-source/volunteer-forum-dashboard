import {plans} from './media-plans.mjs';

const committee = 'media';
const roles = {manager:'مسؤول اللجنة', deputy:'نائب المسؤول', lead:'قائد فريق', member:'عضو', observer:'اللجنة العليا'};
const stages = {
  idea:'فكرة جديدة', preparation:'قيد الإعداد', production:'قيد الإنتاج', review:'قيد المراجعة',
  changes:'مطلوب تعديل', approved:'معتمد للنشر', scheduled:'مجدول', published:'منشور',
  archived:'مؤرشف', paused:'متوقف', cancelled:'ملغى'
};
const decisions = {
  draft:'مسودة', submitted:'مُرسل', reviewing:'قيد المراجعة', information:'بحاجة إلى معلومات إضافية',
  test:'مرشح لاختبار عملي', trial:'قيد التجربة', accepted:'معتمد', declined:'غير مقبول', deferred:'مؤجل'
};
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
const productionSteps = [
  [stages.idea,'تسجيل الفكرة وتحديد الأولوية'],
  [stages.preparation,'كتابة النص وتجميع المواد'],
  [stages.production,'التصميم أو التصوير أو المونتاج'],
  [stages.review,'فحص المحتوى وإجراء التعديلات'],
  [stages.approved,'الموافقة وتحديد موعد النشر'],
  ['منشور ومؤرشف','حفظ الروابط والملفات والنتائج']
];

function renderOperatingOverview(panel, teams, render) {
  element('h4', 'إدارة اللجنة الإعلامية', panel);
  element('p', 'التخطيط والتنسيق والاعتماد ومتابعة الفرق', panel);
  const structure = element('ul', '', panel);
  structure.className = 'media-overview';
  for (const [id, name] of Object.entries(areas)) {
    const team = teams.find(record => record.id === id);
    const item = element('li', '', structure);
    element('strong', team?.title ?? name, item);
    element('p', team?.units || teamScopes[id], item);
    if (!team) element('small', 'مقترح للتأسيس', item);
  }
  action(panel, 'عرض ملفات الفرق', () => render('teams'));
  element('h4', 'دورة العمل الإعلامي', panel);
  const flow = element('ol', '', panel);
  flow.className = 'media-overview media-flow';
  for (const [label, description] of productionSteps) {
    const item = element('li', '', flow);
    element('strong', label, item);
    element('p', description, item);
  }
  action(panel, 'عرض لوحة المهام', () => render('tasks'));
}

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
    control.max = 500;
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
      ['uid','معرّف الحساب UID','text',true], ['title','اسم العرض','text',true],
      ['role','صلاحية النظام',{manager:roles.manager,deputy:roles.deputy,lead:roles.lead,member:roles.member}],
      ['teamId','الفريق الأساسي'], ['primaryRole','الدور الأساسي'], ['supportRoles','الفرق والأدوار المساندة'],
      ['skills','المهارات ومستوياتها'], ['availability','التفرّغ'],
      ['state','الحالة',{active:'معتمد ونشط',inactive:'غير نشط',training:'متدرب'}]
    ]
  },
  tasks: {
    title:'المهام والإنتاج',
    fields:[
      ['title','عنوان المهمة','text',true], ['description','الوصف','textarea'], ['project','المشروع أو الحملة'],
      ['teamId','الفريق'], ['assigneeId','المكلّف'], ['contributors','المساهمون'],
      ['priority','الأولوية',{normal:'عادية',high:'عالية',urgent:'عاجلة'}], ['due','موعد الاستحقاق','date'],
      ['state','مرحلة التنفيذ',stages], ['fileUrl','رابط ملف العمل','url'], ['note','الملاحظات أو سبب الإيقاف','textarea']
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

  async function save(group, record, values, audit = true) {
    const ref = record?.id ? path(group, record.id) : sdk.doc(collection(group));
    const log = sdk.doc(collection('audit'));
    await sdk.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists() !== Boolean(record?.updatedAt)
          || (snapshot.exists() && !snapshot.data().updatedAt?.isEqual(record.updatedAt))) {
        throw new Error('stale-record');
      }
      const payload = {...values, updatedAt:sdk.serverTimestamp()};
      if (audit) {
        payload.auditId = log.id;
        transaction.set(log, {
          actorId:uid, group, targetId:ref.id, operation:snapshot.exists() ? 'update' : 'create',
          timestamp:sdk.serverTimestamp()
        });
      }
      transaction.set(ref, payload, {merge:snapshot.exists()});
    });
  }

  async function render(tab = 'home', taskPreset) {
    if (stopped) return;
    const current = ++renderId;
    root.replaceChildren();
    const feedback = element('p', 'جارٍ تحميل مساحة اللجنة…', root);
    feedback.setAttribute('role', 'status');
    try {
      const [membership, upper, application] = await Promise.all([
        read('members', uid), read('oversight', uid), read('applications', uid)
      ]);
      if (stopped || current !== renderId) return;
      feedback.textContent = '';
      const role = membership?.state === 'active' ? membership.role : upper?.state === 'active' ? 'observer' : null;
      const manager = role === 'manager';
      const operator = manager || role === 'deputy';
      const lead = role === 'lead';
      const tabs = {home:'الرئيسية', ...Object.fromEntries(Object.entries(definitions).map(([key, value]) => [key,value.title])),
        applications:operator ? 'طلبات التطوع' : 'طلب التطوع'};
      if (role) Object.assign(tabs, {workPlan:'خطة عمل اللجنة', coveragePlan:'خطة التغطية الإعلامية'});
      if (!role) for (const key of Object.keys(definitions)) delete tabs[key];
      if (role && !operator && !lead) delete tabs.members;
      if (manager) tabs.audit = 'سجل العمليات';
      if (!tabs[tab]) tab = 'home';
      const nav = element('nav', '', root);
      nav.className = 'media-tabs';
      nav.setAttribute('aria-label', 'صفحات اللجنة');
      for (const [key, label] of Object.entries(tabs)) {
        const button = action(nav, label, () => render(key));
        if (key === tab) button.setAttribute('aria-current', 'page');
      }
      const panel = element('div', '', root);
      panel.className = 'card media-panel';
      element('h3', tabs[tab], panel);
      const status = element('p', '', panel);
      status.setAttribute('role', 'status');
      function form(fields, values, onSave, label = 'حفظ') {
        const editor = element('form', '', panel);
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
            status.textContent = error.message === 'stale-record'
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
            if (edit && (tab !== 'tasks' || canEditRow(row))) action(item, 'فتح السجل', () => edit(row));
          }
          if (!list.children.length) element('li', 'لا توجد سجلات مطابقة.', list);
        }
        search.oninput = draw;
        draw();
        return list;
      }

      if (tab === 'home') {
        element('p', role ? 'الصلاحية · ' + roles[role] : 'يمكنك تقديم طلب تطوع ومتابعة حالته.', panel);
        if (!role) element('p', 'معرّف حسابك (UID) · ' + uid, panel);
        if (membership) element('p', membership.title + ' · ' + (membership.primaryRole || 'الدور قيد التحديد'), panel);
        if (role) {
          const [teams, tasks, entries] = await Promise.all([
            list('teams'), list('tasks', taskCriteria()), list('publications')
          ]);
          if (stopped || current !== renderId) return;
          const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bahrain'}).format(new Date());
          const open = tasks.filter(row => !['published','archived','cancelled'].includes(row.state));
          element('p', 'الفرق ' + teams.length + ' · المهام المفتوحة ' + open.length +
            ' · المتأخرة ' + open.filter(row => row.due && row.due < today).length +
            ' · مواعيد النشر المجدولة ' + entries.filter(row => row.state === 'scheduled').length, panel);
          renderOperatingOverview(panel, teams, render);
        }
        action(panel, 'طلب التطوع', () => render('applications'));
        return;
      }

      function taskCriteria() {
        if (operator || role === 'observer') return null;
        return lead ? ['teamId','==',membership.teamId] : ['assigneeId','==',uid];
      }

      if (Object.hasOwn(plans, tab)) {
        element('p', 'بنود تشغيلية يمكن تحويلها إلى مهام وتحديد الفريق والمكلّف والموعد قبل الحفظ.', panel);
        action(panel, 'عرض لوحة المهام', () => render('tasks'));
        const tasksList = element('ul', '', panel);
        tasksList.className = 'media-overview';
        for (const [title, description, teamId] of planTasks[tab]) {
          const item = element('li', '', tasksList);
          element('strong', title, item);
          element('p', description, item);
          element('p', 'الفريق المقترح · ' + areas[teamId], item);
          if (operator) action(item, 'إعداد مهمة', () => render('tasks', {
            title, description, teamId, project:tabs[tab], state:'idea'
          }));
        }
        for (const [id, section] of Object.entries(plans[tab])) {
          const details = element('details', '', panel);
          details.id = id;
          element('summary', section.title, details);
          const body = element('div', '', details);
          // Only repository-authored markup from the previous bylaws is rendered here.
          body.innerHTML = section.body;
          if (location.hash.slice(1) === id) details.open = true;
        }
        return;
      }

      if (tab === 'applications') {
        if (application) element('p', 'حالة طلبك · ' + decisions[application.state], panel);
        if (!application || ['draft','information'].includes(application.state)) {
          const fields = [
            ['title','اسمك','text',true], ['area','المجال الأساسي',areas], ['interests','مجالات إضافية'],
            ['experience','الخبرات والمهارات','textarea',true], ['tools','البرامج والأدوات'],
            ['portfolio','رابط نموذج عمل اختياري','url'], ['availability','التفرغ المتوقع','text',true],
            ['learning','مجالات ترغب في تعلّمها'], ['specialty','التجربة التخصصية','textarea'],
            ['consent','أوافق على استخدام البيانات لمراجعة طلب التطوع وإتاحتها للمخوّلين بهذه المراجعة',{'':'اختر',yes:'أوافق'},true]
          ];
          const editor = form(fields, {...application, title:application?.title ?? user.displayName}, (values, submitter) =>
            save('applications', application ?? {id:uid}, {...values,state:submitter?.value === 'draft' ? 'draft' : 'submitted'}, false), 'إرسال الطلب');
          if (!application || application.state === 'draft') {
            const draft = element('button', 'حفظ مسودة', editor);
            draft.className = 'btn secondary';
            draft.value = 'draft';
            draft.formNoValidate = true;
          }
          const prompts = {editorial:'اذكر مثالًا على تحرير خبر.',visual:'صف دورك في تصوير أو مونتاج مادة.',
            design:'صف عملًا تصميميًا أنجزته.',platforms:'اشرح كيف تجهّز منشورًا لمنصتين.',
            archive:'كيف تفهرس مجموعة صور؟',field:'كيف تخطط لتغطية فعالية ميدانية؟'};
          const specialty = editor.elements.specialty;
          function prompt() { specialty.placeholder = prompts[editor.elements.area.value]; }
          editor.elements.area.onchange = prompt;
          prompt();
        }
        if (operator) {
          element('h4', 'مراجعة طلبات المتطوعين', panel);
          const rows = await list('applications', ['state','!=','draft']);
          let reviewForms = [];
          records(rows, row => [row.title, areas[row.area], decisions[row.state], row.experience, row.availability], async row => {
            try {
              const evaluation = await read('evaluations', row.id);
              if (stopped || current !== renderId) return;
              reviewForms.forEach(node => node.remove());
              reviewForms = [
                form([['state','قرار المراجعة البشرية',Object.fromEntries(Object.entries(decisions).filter(([key]) => key !== 'draft'))]], row, values => save('applications', row, values), 'حفظ حالة الطلب'),
                form([['notes','ملاحظات المراجعة الخاصة','textarea',true], ['recommendedRole','الدور المقترح']], evaluation,
                  values => save('evaluations', evaluation ?? {id:row.id}, values), 'حفظ التقييم الخاص')
              ];
              reviewForms[0].scrollIntoView({block:'nearest'});
            } catch {
              status.textContent = 'تعذّر فتح التقييم.';
            }
          });
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

      const criteria = tab === 'tasks' ? taskCriteria() : tab === 'members' && lead ? ['teamId','==',membership.teamId] : null;
      const rows = await list(tab, criteria);
      const teams = ['members','tasks'].includes(tab) ? await list('teams') : [];
      const members = (tab === 'tasks' || tab === 'teams') && operator ? await list('members') :
        tab === 'tasks' && lead ? await list('members', ['teamId','==',membership.teamId]) : [];
      const content = tab === 'publications' ? await list('content') : [];
      const tasks = tab === 'content' ? await list('tasks', taskCriteria()) : [];
      if (stopped || current !== renderId) return;
      const definition = definitions[tab];
      const canCreate = tab === 'members' ? manager : operator;
      const canEdit = canCreate || (tab === 'tasks' && (lead || role === 'member'));
      const canEditRow = row => canEdit && (tab !== 'tasks' || operator || ['idea','preparation','production','review','changes'].includes(row.state));
      const options = (items, empty = 'اختر') => ({'':empty,...Object.fromEntries(items.map(row => [row.id,row.title]))});
      const linked = {
        teamId:options(teams, 'غير محدد'), assigneeId:options(members, 'غير مسند'),
        contentId:options(content), taskId:options(tasks, 'غير مرتبط')
      };
      let activeForm;
      function edit(row, preset) {
        activeForm?.remove();
        const fields = definition.fields.filter(([name]) => {
          if (row && name === 'uid') return false;
          return canCreate || name === 'state' || name === 'note' || (lead && name === 'assigneeId');
        }).map(([name, title, type, required]) => [
          name,title,name === 'state' && tab === 'tasks' && !operator
            ? Object.fromEntries(Object.entries(stages).filter(([key]) => ['idea','preparation','production','review','changes'].includes(key)))
            : linked[name] ?? type,required
        ]);
        activeForm = form(fields, row ?? preset, values => {
          const id = values.uid;
          delete values.uid;
          return save(tab, row ?? (id ? {id} : null), values);
        });
        activeForm.querySelector('input,select,textarea')?.focus();
      }
      if (canCreate) action(panel, 'إضافة سجل', () => edit());
      if (tab === 'tasks' && canCreate && taskPreset) {
        edit(null, {...taskPreset, teamId:teams.some(team => team.id === taskPreset.teamId) ? taskPreset.teamId : ''});
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
      if (tab === 'tasks') {
        action(panel, 'عرض جدول المهام', () => {
          const existing = panel.querySelector('.media-task-table');
          if (existing) { existing.remove(); return; }
          const wrap = element('div', '', panel);
          wrap.className = 'media-task-table';
          wrap.tabIndex = 0;
          wrap.setAttribute('aria-label','جدول المهام');
          const table = element('table', '', wrap);
          const heading = element('tr', '', element('thead', '', table));
          for (const label of ['المهمة','المرحلة','الأولوية','موعد الاستحقاق']) {
            element('th', label, heading).scope = 'col';
          }
          const body = element('tbody', '', table);
          for (const row of rows) {
            const tr = element('tr', '', body);
            const title = element('td', '', tr);
            if (canEditRow(row)) action(title, row.title, () => edit(row));
            else title.textContent = row.title;
            element('td', stages[row.state], tr);
            element('td', {normal:'عادية',high:'عالية',urgent:'عاجلة'}[row.priority], tr);
            element('td', row.due || 'غير محدد', tr);
          }
        });
        action(panel, 'عرض مراحل الإنتاج', () => {
          let board = panel.querySelector('.media-board');
          if (board) { board.remove(); return; }
          board = element('div', '', panel);
          board.className = 'media-board';
          for (const [key, label] of Object.entries(stages)) {
            const column = element('section', '', board);
            element('h4', label, column);
            for (const row of rows.filter(item => item.state === key)) {
              if (canEditRow(row)) action(column, row.title, () => edit(row));
              else element('p', row.title, column);
            }
          }
        });
      }
      records(rows, row => {
        if (tab === 'teams') {
          const approved = members.filter(member => member.teamId === row.id && member.state === 'active').length;
          return [row.title, row.description, row.units, row.leader, row.skills,
            operator ? 'المعتمدون ' + approved + ' · الشواغر ' + Math.max(0,row.target-approved) : '',
            'الحد الأدنى ' + row.minimum + ' · المستهدف ' + row.target];
        }
        if (tab === 'tasks') return [row.title, stages[row.state], row.description, row.due,
          definitions.tasks.fields.find(([name]) => name === 'priority')[2][row.priority], row.note, row.fileUrl];
        if (tab === 'members') return [row.title, roles[row.role], row.primaryRole, row.supportRoles, row.skills, row.availability];
        return [row.title, row.description, row.fileUrl, tasks.find(task => task.id === row.taskId)?.title];
      }, canEdit ? edit : null);
    } catch (error) {
      if (stopped || current !== renderId) return;
      feedback.textContent = error.code === 'permission-denied'
        ? 'تعذّر فتح هذه البيانات بالصلاحيات الحالية.'
        : 'تعذّر تحميل البيانات. تحقق من الاتصال وأعد المحاولة.';
      action(root, 'إعادة المحاولة', () => render(tab));
    }
  }

  const initialView = new URLSearchParams(location.search).get('view');
  render(Object.hasOwn(plans, initialView) ? initialView : 'home');
  return () => {
    stopped = true;
    root.replaceChildren();
    root.hidden = true;
  };
}
