# النشر على سيرفر Contabo (بجانب Odoo)

الفكرة: الخادم `backend/` يعمل على المنفذ **6975** داخل السيرفر فقط (127.0.0.1)، و nginx يعرضه على الإنترنت عبر HTTPS
باسم نطاق فرعي مثل `api.marifah.edu.my`. الواجهة `frontend/` ملفات ثابتة (GitHub Pages للتجربة، ولاحقاً على السيرفر نفسه).

> لماذا HTTPS ونطاق؟ صفحات GitHub Pages تعمل على HTTPS، والمتصفح يمنع منها الاتصال بـ `http://62.171.128.10:6975`
> (Mixed Content). كذلك متجرا Google وApple يشترطان HTTPS. لذلك نحتاج سجل DNS: `api.marifah.edu.my → 62.171.128.10`.

## 1) تجهيز السيرفر (مرة واحدة)
```bash
# Node 22 (مطلوب)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git
node -v    # يجب أن يكون v22.13 أو أحدث

sudo useradd --system --home /opt/marifah-mobile-app --shell /usr/sbin/nologin marifah
sudo git clone https://github.com/ezzittech/marifah-mobile-app /opt/marifah-mobile-app
sudo chown -R marifah:marifah /opt/marifah-mobile-app
```

## 2) الإعدادات
```bash
cd /opt/marifah-mobile-app/backend
sudo -u marifah cp .env.example .env
sudo -u marifah nano .env     # عبّئ JWT_SECRET و ODOO_USER و ODOO_PASS
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # لتوليد JWT_SECRET
sudo chmod 600 .env
```
ملاحظة: `ODOO_URL=http://127.0.0.1:8069` لأن الخادم على نفس جهاز Odoo (أسرع وأأمن).

## 3) إنشاء حسابات الطلاب
```bash
cd /opt/marifah-mobile-app/backend
sudo -u marifah npm run import-students -- --dry-run   # معاينة بدون كتابة
sudo -u marifah npm run import-students                # ينشئ الحسابات
# كلمات المرور المؤقتة في data/initial-passwords.csv — وزّعها ثم احذف الملف:
sudo shred -u data/initial-passwords.csv
# حساب واحد يدوياً:
sudo -u marifah npm run create-user -- --login MIS0529 --name "اسم الطالب" --partner-id 123
```
يُطلب من الطالب تغيير كلمة المرور المؤقتة عند أول دخول.

## 4) تشغيل الخدمة
```bash
sudo cp deploy/marifah-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now marifah-api
curl http://127.0.0.1:6975/api/health
journalctl -u marifah-api -f
```

## 5) HTTPS عبر nginx
```bash
sudo cp deploy/nginx-api.conf /etc/nginx/sites-available/marifah-api
sudo ln -s /etc/nginx/sites-available/marifah-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.marifah.edu.my
curl https://api.marifah.edu.my/api/health
```

## 6) ربط الواجهة
عدّل `frontend/config.js` وضع `API_BASE: 'https://api.marifah.edu.my'` ثم ارفعه.
- **تجربة على GitHub Pages**: Settings → Pages → Source: GitHub Actions. تأكد أن `https://ezzittech.github.io` موجود في `ALLOWED_ORIGINS`.
  - جرّب بدون خادم: افتح الرابط مع `?demo` في آخره.
- **لاحقاً على السيرفر نفسه**: انسخ مجلد `frontend/` إلى nginx كموقع ثابت (مثلاً `app.marifah.edu.my`) وأضفه إلى `ALLOWED_ORIGINS`.

## تحديث لاحق
```bash
cd /opt/marifah-mobile-app && sudo -u marifah git pull && sudo systemctl restart marifah-api
```

## المنافذ
6975 = Marifah API. المنافذ غيرها محجوزة لتطبيقاتك الأخرى (لم نستخدمها).

> ملاحظة: المنفذ 8070 مشغول بخدمة Odoo (longpolling) على هذا السيرفر، لذلك يستخدم تطبيقنا **6975**.

## الطريقة المؤقتة على IP:المنفذ (بدون نطاق)
`deploy/nginx-app.conf` يقدّم الواجهة والـ API معاً على المنفذ 6976: `http://62.171.128.10:6976/`
(يجب فتح المنفذ 6976 في جدار الحماية). عند توفر نطاق نستبدله بـ HTTPS كما في الأقسام أعلاه.
