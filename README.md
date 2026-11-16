# Marifah Mobile App

تطبيق مدرسة معرفة: بوابة واحدة تجمع **Odoo** (الرسوم + Billplz) و**Fedena** (الدرجات والجدول) وتطبيقات المدرسة الأخرى.

| المجلد | المحتوى |
|---|---|
| `frontend/` | الواجهة (PWA، عربي/إنجليزي، فاتح/داكن) — بدون أي خطوة بناء |
| `backend/` | الخادم (Node 22 بلا مكتبات خارجية): الدخول، Odoo، Billplz، وسيط Fedena لاحقاً |
| `deploy/`, `docs/DEPLOY.md` | خدمة systemd وإعداد nginx وخطوات النشر |
| `legacy/` | النسخة الأولى القديمة (للمرجع فقط) |

## تجربة سريعة
- الواجهة بدون خادم: شغّل `cd frontend && python3 -m http.server 8080` وافتح `http://localhost:8080/?demo`.
- الخادم: `cd backend && cp .env.example .env` (عبّئه) ثم `npm start`. الاختبارات: `npm test`.

## الأمان
لا أسرار في Git. كل الأسرار في `backend/.env` (مستبعد). الواجهة لا تتصل بـ Odoo/Fedena مباشرة أبداً.
