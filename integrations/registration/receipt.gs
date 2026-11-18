const FORUM_PROJECT = 'forum-committee-membership';
const FORUM_FIREBASE_KEY = 'AIzaSyASssLjqgz-IViLCvPwDhjLayhLiDi2mGc';

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({status:'ready'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const result = status => ContentService.createTextOutput(JSON.stringify({status}))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    const body = JSON.parse(event.postData.contents);
    if(typeof body.idToken !== 'string' || body.idToken.length > 10000) return result('invalid');
    const identity = UrlFetchApp.fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FORUM_FIREBASE_KEY,
      {method:'post',contentType:'application/json',payload:JSON.stringify({idToken:body.idToken}),
       muteHttpExceptions:true}
    );
    if(identity.getResponseCode() !== 200) return result('unauthorized');
    const person = JSON.parse(identity.getContentText()).users?.[0];
    if(!person?.emailVerified || !person.localId || !/^[A-Za-z0-9_-]{1,128}$/.test(person.localId)) return result('unauthorized');
    const response = UrlFetchApp.fetch(
      'https://firestore.googleapis.com/v1/projects/'+FORUM_PROJECT+
      '/databases/(default)/documents/forumCommittees/media/applications/'+person.localId,
      {headers:{Authorization:'Bearer '+body.idToken},muteHttpExceptions:true}
    );
    if(response.getResponseCode() !== 200) return result('missing_application');
    const fields = JSON.parse(response.getContentText()).fields;
    if(fields?.kind?.stringValue !== 'athar-trial' || fields?.consent?.stringValue !== 'yes' ||
       fields?.email?.stringValue !== person.email.toLowerCase()) return result('invalid_application');
    const title = fields.title.stringValue;
    const receiptKey = 'receipt_'+person.localId;
    const lock = LockService.getScriptLock();
    if(!lock.tryLock(5000)) return result('busy');
    try {
      const properties = PropertiesService.getScriptProperties();
      const prior = properties.getProperty(receiptKey);
      if(prior === 'sent') return result('already_sent');
      if(prior === 'sending') return result('unknown');
      if(MailApp.getRemainingDailyQuota() < 1) return result('quota');
      const lines = [
        'أهلًا '+title+' 🌿','',
        'شكرًا لمشاركتك في تجربة التسجيل بأكاديمية مشروع «أثَر» للتطوع، ضمن بوابة منتدى العمل التطوعي.','',
        'استلمنا طلبك بنجاح، وسيقوم فريق العضويات بمراجعته.','',
        'بعد تفعيل عضويتك، ستصلك رسالة على رقم واتساب الذي سجّلته، تتضمن زرًا لفتح البوابة. عندها سجّل الدخول باستخدام حساب Google المرتبط بهذا البريد.','',
        'هذه المرحلة مخصصة لتجربة التسجيل والدخول إلى البوابة، وسيُعلن عن القبول في البرامج التدريبية ومواعيدها لاحقًا.','',
        'إذا واجهت صعوبة أثناء التجربة، يمكنك الرد على هذا البريد وشرح ما حدث.','',
        'شكرًا لمساعدتك في تطوير التجربة 🤝',
        'فريق منتدى العمل التطوعي'
      ];
      properties.setProperty(receiptKey,'sending');
      MailApp.sendEmail({
        to:person.email,
        subject:'استلمنا طلبك التجريبي للانضمام إلى أكاديمية أثَر',
        body:lines.join('\n'),
        name:'منتدى العمل التطوعي',
        replyTo:'volunteerforumbh@gmail.com'
      });
      properties.setProperty(receiptKey,'sent');
      return result('sent');
    } finally { lock.releaseLock(); }
  } catch { return result('unknown'); }
}
