export function normalizePhone(value) {
  const digits = value.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).replace(/[\s()-]/g, '');
  const phone = /^\d{8}$/.test(digits) ? '+973' + digits : digits.replace(/^00/, '+');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('أدخل رقم واتساب مع رمز الدولة.');
  return phone;
}

const sdk = 'https://www.gstatic.com/firebasejs/11.10.0/';
const [{initializeApp}, authSdk, dbSdk] = await Promise.all([
  import(sdk+'firebase-app.js'), import(sdk+'firebase-auth.js'), import(sdk+'firebase-firestore.js')
]);
const app = initializeApp({apiKey:'AIzaSyASssLjqgz-IViLCvPwDhjLayhLiDi2mGc',authDomain:'forum-committee-membership.firebaseapp.com',projectId:'forum-committee-membership',appId:'1:486503955171:web:b930db260197d4614ea3d6'});
const auth = authSdk.getAuth(app);
await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
const db = dbSdk.getFirestore(app);
const form = document.getElementById('application');
const status = document.getElementById('status');
const email = form.elements.email;
const submit = document.getElementById('submit');
const login = document.getElementById('login');
const account = document.getElementById('account');
let saving = false;
let receiptEndpoint = '';
try {
  const response = await fetch('./registration-config.json',{cache:'no-store'});
  if(response.ok) receiptEndpoint = (await response.json()).receiptEndpoint || '';
} catch {}
const provider = new authSdk.GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
login.onclick = async () => {
  login.disabled = true;
  try { await authSdk.signInWithPopup(auth,provider); }
  catch { status.textContent = 'تعذّر تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مجددًا.'; }
  finally { login.disabled = false; }
};
document.getElementById('switch').onclick = () => authSdk.signOut(auth);
authSdk.onAuthStateChanged(auth,user => {
  email.value = user?.email || '';
  account.textContent = user ? 'حساب التسجيل · '+user.email : 'سجّل الدخول بحساب Google لتأكيد بريدك.';
  login.hidden = Boolean(user);
  document.getElementById('switch').hidden = !user;
  submit.disabled = !user || saving;
});
async function sendReceipt(user) {
  if(!receiptEndpoint) return 'unconfigured';
  try {
    const endpoint = new URL(receiptEndpoint);
    if(endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com') return 'unconfigured';
    const response = await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({idToken:await user.getIdToken()}),
      signal:AbortSignal.timeout(45000)
    });
    return response.ok ? (await response.json()).status : 'unknown';
  } catch { return 'unknown'; }
}
form.onsubmit = async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if(!user?.emailVerified || saving || !form.reportValidity()) return;
  if(!form.elements.name.value.trim()) { status.textContent = 'أدخل اسمك الكامل.'; return; }
  let phone;
  try { phone = normalizePhone(form.elements.phone.value); }
  catch(error) { status.textContent = error.message; return; }
  saving = true;
  submit.disabled = true;
  status.textContent = 'جارٍ حفظ طلبك…';
  try {
    const ref = dbSdk.doc(db,'forumCommittees','media','applications',user.uid);
    const created = await dbSdk.runTransaction(db,async tx => {
      const prior = await tx.get(ref);
      if(prior.exists()) return false;
      tx.set(ref,{
        title:form.elements.name.value.trim(),
        phone,
        email:user.email.toLowerCase(),
        kind:'athar-trial',
        consent:'yes',
        state:'submitted',
        createdAt:dbSdk.serverTimestamp(),
        updatedAt:dbSdk.serverTimestamp()
      });
      return true;
    });
    status.textContent = created ? 'تم استلام طلبك بنجاح ✅ جارٍ إرسال بريد التأكيد…' : 'طلبك مسجل بالفعل. جارٍ التحقق من بريد التأكيد…';
    const result = await sendReceipt(user);
    document.getElementById('success').hidden = false;
    form.hidden = true;
    status.textContent = ['sent','already_sent'].includes(result)
      ? 'تم استلام طلبك بنجاح ✅ أرسلنا رسالة تأكيد إلى بريدك الإلكتروني.'
      : 'تم استلام طلبك بنجاح ✅ بريد التأكيد لم يُؤكّد إرساله بعد، وطلبك محفوظ لدى فريق العضويات.';
  } catch {
    status.textContent = 'تعذّر تأكيد حفظ الطلب. تحقق من الاتصال ثم أعد المحاولة؛ يُحفظ طلب واحد لكل حساب.';
  } finally {
    saving = false;
    submit.disabled = !auth.currentUser;
  }
};
