# نقل Edge Functions من Vercel إلى Supabase

تم استبدال `api/gemini.ts` و `api/report-error.ts` (Vercel) بدالتين على Supabase:
`supabase/functions/gemini-proxy` و `supabase/functions/report-error`.

## 1. تثبيت Supabase CLI (مرة واحدة)

```bash
npm install -g supabase
```

## 2. تسجيل الدخول وربط المشروع

```bash
supabase login
supabase link --project-ref <project-ref>   # موجود في رابط لوحة تحكم Supabase
```

## 3. ضبط الأسرار (Secrets) — تماماً كمتغيرات البيئة في Vercel

```bash
supabase secrets set GEMINI_API_KEY=xxxxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxxxx
supabase secrets set TELEGRAM_CHAT_ID=xxxxx
supabase secrets set ALLOWED_ORIGINS=https://novateam.vercel.app,https://yourdomain.me
```

> `ALLOWED_ORIGINS` اختياري — لو لم تضبطه، الدالة تسمح لأي origin (`*`)، وهذا أقل أماناً. يفضّل ضبطه بمجرد معرفة النطاق النهائي.

## 4. نشر الدالتين

```bash
supabase functions deploy gemini-proxy
supabase functions deploy report-error
```

## 5. لا حاجة لأي تغيير على Vercel نفسه

التطبيق (الواجهة) يبقى منشوراً على Vercel كما هو — فقط الـ API routes (`/api/*`) حُذفت لأن الواجهة الآن تستدعي Supabase مباشرة عبر `supabase.functions.invoke(...)`، الذي يتولى تلقائياً:
- بناء الرابط الصحيح (`https://<project-ref>.functions.supabase.co/<name>`)
- إرفاق مفتاح anon/التوكن إن وُجد

لذلك **لا حاجة لمتغيرات بيئة جديدة على الواجهة** (`VITE_*`) — فقط `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY` الموجودتان مسبقاً.

## 6. اختبار محلي (اختياري)

```bash
supabase functions serve gemini-proxy --env-file .env.local
```

## ملخص الفرق عن Vercel

| | Vercel (سابقاً) | Supabase (الآن) |
|---|---|---|
| مكان الكود | `api/*.ts` | `supabase/functions/*/index.ts` |
| Runtime | Vercel Edge | Deno (Supabase Edge) |
| الأسرار | Vercel env vars | `supabase secrets set` |
| النشر | تلقائي مع كل push | `supabase functions deploy <name>` |
| الاستدعاء من الواجهة | `fetch("/api/gemini")` | `supabase.functions.invoke("gemini-proxy")` |

كل المنطق الداخلي (التحقق من الكوتا، بناء رسالة تيليجرام، التعامل مع الأخطاء) بقي كما هو — فقط طبقة النقل تغيّرت.
