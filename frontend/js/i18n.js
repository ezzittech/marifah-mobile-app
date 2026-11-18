// Bilingual strings. English is the default language.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export const DICT = {
  en: {
    appName: 'Marifah', school: 'Marifah International School',
    'login.welcome': 'Welcome back', 'login.sub': 'Sign in to your student portal',
    'login.id': 'Student ID', 'login.idPh': 'e.g. MIS0529', 'login.pw': 'Password',
    'login.submit': 'Sign In', 'login.help': 'Forgot your password? Please contact the school office.',
    'login.required': 'Enter your Student ID and password.',
    'login.demo': 'Preview mode — any ID and password will work.',
    'greet.morning': 'Good morning', 'greet.afternoon': 'Good afternoon', 'greet.evening': 'Good evening',
    'nav.home': 'Home', 'nav.finance': 'Fees', 'nav.academic': 'Academic', 'nav.profile': 'Profile',
    'home.balance': 'Balance due', 'home.payNow': 'Pay now', 'home.allPaid': 'All paid',
    'home.student': 'Student', 'home.studentId': 'Student ID',
    'home.attendance': 'Attendance', 'home.average': 'Average grade',
    'home.today': "Today's classes", 'home.timetable': 'Timetable',
    'home.recentGrades': 'Subjects', 'home.seeAll': 'See all',
    'home.preview': 'Preview', 'home.live': 'Live', 'home.mySubjects': 'My subjects', 'home.perWeek': '{n}/week',
    'home.noClasses': 'No classes today', 'home.noClassesSub': 'Enjoy your day off!',
    'home.nextUp': 'Next class', 'home.now': 'Now',
    'quick.pay': 'Pay fees', 'quick.grades': 'Grades', 'quick.timetable': 'Timetable', 'quick.report': 'Report', 'quick.soon': 'Soon',
    'fin.title': 'Fees & Payments', 'fin.sub': 'Your invoices and payment history',
    'fin.totalDue': 'Total due', 'fin.billed': 'Billed', 'fin.paid': 'Paid', 'fin.paidPct': 'paid',
    'fin.all': 'All', 'fin.unpaid': 'Unpaid', 'fin.settled': 'Paid',
    'fin.status.paid': 'Paid', 'fin.status.unpaid': 'Unpaid', 'fin.status.partial': 'Partial', 'fin.status.overdue': 'Overdue',
    'fin.pay': 'Pay', 'fin.paying': 'Opening…', 'fin.remaining': 'Remaining', 'fin.amount': 'Amount',
    'fin.issued': 'Issued', 'fin.due': 'Due', 'fin.empty': 'No invoices here', 'fin.emptySub': 'Nothing to show for this filter.',
    'fin.noAccount': 'No finance account linked', 'fin.noAccountSub': 'Please contact the school office.',
    'fin.demoPay': 'Preview mode: online payment is disabled.',
    'acad.title': 'Academic', 'acad.sub': 'Grades, subjects and timetable',
    'acad.grades': 'Grades', 'acad.timetable': 'Timetable',
    'acad.average': 'Overall average', 'acad.present': 'Days present', 'acad.absent': 'Days absent',
    'acad.preview': 'Preview data — live grades and timetable from the school system are coming soon.',
    'acad.noClasses': 'No classes on this day',
    'day.sun': 'Sun', 'day.mon': 'Mon', 'day.tue': 'Tue', 'day.wed': 'Wed', 'day.thu': 'Thu', 'day.fri': 'Fri', 'day.sat': 'Sat',
    'prof.title': 'Profile', 'prof.language': 'Language', 'prof.languageSub': 'App language',
    'prof.appearance': 'Appearance', 'prof.auto': 'Auto', 'prof.light': 'Light', 'prof.dark': 'Dark',
    'prof.security': 'Change password', 'prof.securitySub': 'Keep your account safe',
    'prof.logout': 'Sign out', 'prof.logoutQ': 'Sign out?', 'prof.logoutSub': 'You will need your password to sign in again.',
    'prof.cancel': 'Cancel', 'role.student': 'Student', 'role.parent': 'Parent', 'role.teacher': 'Teacher', 'role.counselor': 'Counselor', 'role.admin': 'Admin',
    'pw.title': 'Change password', 'pw.forced': 'For your security, choose a new password before continuing.',
    'pw.current': 'Current password', 'pw.new': 'New password', 'pw.confirm': 'Confirm new password',
    'pw.hint': 'At least 8 characters. Mix letters, numbers and symbols.',
    'pw.mismatch': 'Passwords do not match.', 'pw.short': 'Use at least 8 characters.', 'pw.save': 'Save password', 'pw.done': 'Password updated',
    'common.retry': 'Try again', 'common.loadFail': "Couldn't load your data", 'common.loadFailSub': 'Check your connection and try again.',
    'common.offline': 'You appear to be offline', 'common.back': 'Back',
    'err.invalid_credentials': 'Incorrect Student ID or password.',
    'err.too_many_attempts': 'Too many attempts. Please wait a few minutes.',
    'err.network': 'Cannot reach the server. Check your connection.',
    'err.generic': 'Something went wrong. Please try again.',
    'err.weak_password': 'Choose a stronger password.',
    'err.payments_unavailable': 'Online payment is not available right now.',
    'err.already_paid': 'This invoice is already paid.',
  },
  ar: {
    appName: 'معرفة', school: 'مدرسة معرفة العالمية',
    'login.welcome': 'أهلاً بعودتك', 'login.sub': 'سجّل الدخول إلى بوابة الطالب',
    'login.id': 'رقم الطالب', 'login.idPh': 'مثال: MIS0529', 'login.pw': 'كلمة المرور',
    'login.submit': 'تسجيل الدخول', 'login.help': 'نسيت كلمة المرور؟ يرجى التواصل مع إدارة المدرسة.',
    'login.required': 'أدخل رقم الطالب وكلمة المرور.',
    'login.demo': 'وضع المعاينة — يقبل أي رقم وكلمة مرور.',
    'greet.morning': 'صباح الخير', 'greet.afternoon': 'مساء الخير', 'greet.evening': 'مساء الخير',
    'nav.home': 'الرئيسية', 'nav.finance': 'الرسوم', 'nav.academic': 'الأكاديمي', 'nav.profile': 'حسابي',
    'home.balance': 'الرصيد المستحق', 'home.payNow': 'ادفع الآن', 'home.allPaid': 'مسدّد بالكامل',
    'home.student': 'طالب', 'home.studentId': 'رقم الطالب',
    'home.attendance': 'الحضور', 'home.average': 'المعدل العام',
    'home.today': 'حصص اليوم', 'home.timetable': 'الجدول',
    'home.recentGrades': 'المواد', 'home.seeAll': 'عرض الكل',
    'home.preview': 'تجريبي', 'home.live': 'مباشر', 'home.mySubjects': 'موادي', 'home.perWeek': '{n}/أسبوع',
    'home.noClasses': 'لا توجد حصص اليوم', 'home.noClassesSub': 'استمتع بيوم الراحة!',
    'home.nextUp': 'الحصة القادمة', 'home.now': 'الآن',
    'quick.pay': 'دفع الرسوم', 'quick.grades': 'الدرجات', 'quick.timetable': 'الجدول', 'quick.report': 'التقرير', 'quick.soon': 'قريباً',
    'fin.title': 'الرسوم والمدفوعات', 'fin.sub': 'فواتيرك وسجل المدفوعات',
    'fin.totalDue': 'إجمالي المستحق', 'fin.billed': 'المفوتر', 'fin.paid': 'المدفوع', 'fin.paidPct': 'مدفوع',
    'fin.all': 'الكل', 'fin.unpaid': 'غير مسددة', 'fin.settled': 'مسددة',
    'fin.status.paid': 'مدفوعة', 'fin.status.unpaid': 'غير مدفوعة', 'fin.status.partial': 'جزئية', 'fin.status.overdue': 'متأخرة',
    'fin.pay': 'ادفع', 'fin.paying': 'جارٍ الفتح…', 'fin.remaining': 'المتبقي', 'fin.amount': 'المبلغ',
    'fin.issued': 'تاريخ الإصدار', 'fin.due': 'الاستحقاق', 'fin.empty': 'لا توجد فواتير', 'fin.emptySub': 'لا شيء لعرضه ضمن هذا التصفية.',
    'fin.noAccount': 'لا يوجد حساب مالي مرتبط', 'fin.noAccountSub': 'يرجى التواصل مع إدارة المدرسة.',
    'fin.demoPay': 'وضع المعاينة: الدفع الإلكتروني غير متاح.',
    'acad.title': 'الأكاديمي', 'acad.sub': 'الدرجات والمواد والجدول',
    'acad.grades': 'الدرجات', 'acad.timetable': 'الجدول',
    'acad.average': 'المعدل العام', 'acad.present': 'أيام الحضور', 'acad.absent': 'أيام الغياب',
    'acad.preview': 'بيانات تجريبية — الدرجات والجدول الفعلية من نظام المدرسة قادمة قريباً.',
    'acad.noClasses': 'لا توجد حصص في هذا اليوم',
    'day.sun': 'الأحد', 'day.mon': 'الاثنين', 'day.tue': 'الثلاثاء', 'day.wed': 'الأربعاء', 'day.thu': 'الخميس', 'day.fri': 'الجمعة', 'day.sat': 'السبت',
    'prof.title': 'حسابي', 'prof.language': 'اللغة', 'prof.languageSub': 'لغة التطبيق',
    'prof.appearance': 'المظهر', 'prof.auto': 'تلقائي', 'prof.light': 'فاتح', 'prof.dark': 'داكن',
    'prof.security': 'تغيير كلمة المرور', 'prof.securitySub': 'حافظ على أمان حسابك',
    'prof.logout': 'تسجيل الخروج', 'prof.logoutQ': 'تسجيل الخروج؟', 'prof.logoutSub': 'ستحتاج إلى كلمة المرور لتسجيل الدخول مجدداً.',
    'prof.cancel': 'إلغاء', 'role.student': 'طالب', 'role.parent': 'ولي أمر', 'role.teacher': 'معلم', 'role.counselor': 'مرشد', 'role.admin': 'مدير',
    'pw.title': 'تغيير كلمة المرور', 'pw.forced': 'لأمان حسابك، اختر كلمة مرور جديدة قبل المتابعة.',
    'pw.current': 'كلمة المرور الحالية', 'pw.new': 'كلمة المرور الجديدة', 'pw.confirm': 'تأكيد كلمة المرور',
    'pw.hint': '8 أحرف على الأقل. امزج الحروف والأرقام والرموز.',
    'pw.mismatch': 'كلمتا المرور غير متطابقتين.', 'pw.short': 'استخدم 8 أحرف على الأقل.', 'pw.save': 'حفظ كلمة المرور', 'pw.done': 'تم تحديث كلمة المرور',
    'common.retry': 'حاول مجدداً', 'common.loadFail': 'تعذّر تحميل بياناتك', 'common.loadFailSub': 'تحقق من الاتصال وحاول مجدداً.',
    'common.offline': 'يبدو أنك غير متصل', 'common.back': 'رجوع',
    'err.invalid_credentials': 'رقم الطالب أو كلمة المرور غير صحيحة.',
    'err.too_many_attempts': 'محاولات كثيرة. يرجى الانتظار بضع دقائق.',
    'err.network': 'تعذّر الوصول إلى الخادم. تحقق من الاتصال.',
    'err.generic': 'حدث خطأ ما. حاول مرة أخرى.',
    'err.weak_password': 'اختر كلمة مرور أقوى.',
    'err.payments_unavailable': 'الدفع الإلكتروني غير متاح حالياً.',
    'err.already_paid': 'هذه الفاتورة مدفوعة بالفعل.',
  },
};

// Arabic names for Fedena subjects (falls back to the English name from the server)
const SUBJECT_AR = {
  'English Language': 'اللغة الإنجليزية', 'Arabic Language': 'اللغة العربية', Mathematics: 'الرياضيات',
  Biology: 'الأحياء', Chemistry: 'الكيمياء', Physics: 'الفيزياء', 'Holy Quran': 'القرآن الكريم',
  'Islamic Studies': 'الدراسات الإسلامية', 'Physical Education': 'التربية البدنية',
  'Information and Communications Technology': 'تقنية المعلومات والاتصالات',
  'Co-curricular Activities': 'الأنشطة اللاصفية', Geography: 'الجغرافيا', 'Character Education': 'تربية الشخصية',
};

let current = store.get('marifah.lang') === 'ar' ? 'ar' : 'en';

export const lang = () => current;
export const isRtl = () => current === 'ar';
export const locale = () => (current === 'ar' ? 'ar-u-nu-latn' : 'en-MY');

export function t(key, vars) {
  let s = DICT[current][key] ?? DICT.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function subjectName(name) {
  const clean = String(name || '').replace(/[‎‏]/g, '').trim();
  return current === 'ar' ? SUBJECT_AR[clean] || clean : clean;
}

export function applyLang() {
  const el = document.documentElement;
  el.lang = current;
  el.dir = current === 'ar' ? 'rtl' : 'ltr';
  document.title = t('school');
}

export function setLang(l) {
  current = l === 'ar' ? 'ar' : 'en';
  store.set('marifah.lang', current);
  applyLang();
  window.dispatchEvent(new CustomEvent('langchange'));
}

/* theme: auto | light | dark */
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
export const themePref = () => store.get('marifah.theme') || 'auto';
export function applyTheme() {
  const pref = themePref();
  const dark = pref === 'dark' || (pref === 'auto' && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0f0c13' : '#7a1228';
}
export function setTheme(p) { store.set('marifah.theme', p); applyTheme(); }
if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
