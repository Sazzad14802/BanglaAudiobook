# 🚀 BornoVerse Complete Cloud Deployment Guideline
> **সম্পূর্ণ বিনামূল্যে (100% Free Tier) ক্লাউড হোস্টিং ও প্রোডাকশন ডিপ্লয়মেন্ট নির্দেশিকা**  
> এই নির্দেশিকা অনুসরণ করে আপনি কোনো লোকাল সার্ভার চালানো ছাড়াই ২৪/৭ লাইভ ব্যাকএন্ড, অ্যাডমিন প্যানেল, ক্লাউড ডাটাবেস এবং মোবাইল অ্যাপ চালাতে পারবেন।

---

## 📑 সূচিপত্র (Table of Contents)
1. [সিস্টেম আর্কিটেকচার ও ক্লাউড ম্যাপ (Cloud Architecture)](#1-সিস্টেম-আর্কিটেকচার-ও-ক্লাউড-ম্যাপ)
2. [কেন Vercel/Netlify ব্যাকএন্ডের জন্য প্রযোজ্য নয়?](#2-কেন-vercelnetlify-ব্যাকএন্ডের-জন্য-প্রযোজ্য-নয়)
3. [ফ্রি হোস্টিং স্ট্যাক (100% Free Hosting Stack)](#3-ফ্রি-হোস্টিং-স্ট্যাক-100-free-hosting-stack)
4. [ধাপ ১: ফ্রি ক্লাউড PostgreSQL ডাটাবেস সেটআপ (Neon.tech)](#ধাপ-১-ফ্রি-ক্লাউড-postgresql-ডাটাবেস-সেটআপ-neontech)
5. [ধাপ ২: ব্যাকএন্ড API ও AI সার্ভিস ডিপ্লয় (Render.com)](#ধাপ-২-ব্যাকএন্ড-api-ও-ai-সার্ভিস-ডিপ্লয়-rendercom)
6. [ধাপ ৩: অ্যাডমিন ওয়েব পোর্টাল ডিপ্লয় (Vercel)](#ধাপ-৩-অ্যাডমিন-ওয়েব-পোর্টাল-ডিপ্লয়-vercel)
7. [ধাপ ৪: মোবাইল অ্যাপ কানেক্ট ও APK বিল্ড (Expo EAS)](#ধাপ-৪-মোবাইল-অ্যাপ-কানেক্ট-ও-apk-বিল্ড-expo-eas)
8. [ধাপ ৫: Render ফ্রি সার্ভারকে ২৪/৭ সচল রাখা (Keep-Alive Setup)](#ধাপ-৫-render-ফ্রি-সার্ভারকে-২৪৭-সচল-রাখা-keep-alive-setup)
9. [পরিবেশ ভেরিয়েবল চেকলিস্ট (Environment Variables Reference)](#পরিবেশ-ভেরিয়েবল-চেকলিস্ট-environment-variables-reference)
10. [সাধারণ সমস্যা ও সমাধান (Troubleshooting & FAQs)](#সাধারণ-সমস্যা-ও-সমাধান-troubleshooting--faqs)

---

## 1. সিস্টেম আর্কিটেকচার ও ক্লাউড ম্যাপ

```mermaid
flowchart TD
    subgraph Clients["📱 ইউজার ক্লায়েন্ট"]
        Mobile["📱 Mobile App (Android APK)<br/>React Native / Expo"]
        AdminWeb["💻 Admin Portal<br/>React + Vite (Hosted on Vercel)"]
    end

    subgraph CloudHosting["☁️ Render.com (Free Web Service)"]
        API["⚡ FastAPI Platform Backend<br/>(Port: 8000 / $PORT)"]
        Worker["⚙️ Background Generation Worker<br/>(python -m app.worker)"]
        TTS["🎙️ Gemini TTS & OCR Engine<br/>(FastAPI on Port 8001)"]
    end

    subgraph CloudDB["🗄️ Neon.tech (Free Cloud PostgreSQL)"]
        Postgres[("🐘 Managed PostgreSQL DB<br/>Audiobooks, Users, Chapters, Jobs")]
    end

    subgraph AI["🤖 Google Cloud AI"]
        Gemini["✨ Gemini 3 Flash (OCR)<br/>✨ Gemini 3.8 Flash (TTS)"]
    end

    Mobile -->|"HTTPS (REST API)"| API
    AdminWeb -->|"HTTPS (Admin APIs)"| API
    API -->|"Async SQLAlchemy / asyncpg"| Postgres
    Worker -->|"Polls Jobs Queue"| Postgres
    Worker -->|"Calls AI Engine"| TTS
    TTS -->|"Generates Text & Audio"| Gemini
```

---

## 2. কেন Vercel/Netlify ব্যাকএন্ডের জন্য প্রযোজ্য নয়?

| বিষয় | Vercel / Netlify | Render.com |
| :--- | :--- | :--- |
| **আর্কিটেকচার** | **Serverless Functions** ( stateless, অল্প সময়ের জন্য চলে ) | **Persistent Web Service** ( একটানা চলতে পারে ) |
| **টাইমআউট লিমিট** | ফ্রি টায়ারে মাত্র **১০ থেকে ৬০ সেকেন্ড** | কোনো টাইমআউট নেই, ব্যাকগ্রাউন্ড প্রসেস চলতে পারে |
| **ব্যাকগ্রাউন্ড ওয়ার্কার** | ❌ **অসম্ভব** (`python -m app.worker` রান করা যায় না) | ✅ **সম্ভব** (ব্যাকগ্রাউন্ডে ওয়ার্কার নির্বিঘ্নে চলে) |
| **ফাইল আপলোড ও স্টোরেজ** | ❌ রিড-অনলি ফাইলসিস্টেম (PDF বা অডিও লোকালি সেভ হয় না) | ✅ ডিস্ক স্টোরেজ সাপোর্ট করে |
| **ব্যবহারের ক্ষেত্র** | ফ্রন্টএন্ড ওয়েবসাইট ও অ্যাডমিন পোর্টালে সেরা ⭐ | পাইথন/FastAPI ব্যাকএন্ডে সেরা ⭐ |

> **সিদ্ধান্ত:** ফ্রন্টএন্ড (`admin/`) হোস্ট করার জন্য **Vercel** সেরা, আর পাইথন ব্যাকএন্ড (`platform-api`) ও ওয়ার্কার চালানোর জন্য **Render.com** সেরা।

---

## 3. ফ্রি হোস্টিং স্ট্যাক (100% Free Hosting Stack)

| কম্পোনেন্ট | হোস্টিং প্ল্যাটফর্ম | খরচ | লিংক |
| :--- | :--- | :--- | :--- |
| **Database** | **Neon.tech** | 100% Free (0.5 GB Postgres) | [neon.tech](https://neon.tech) |
| **Backend API + Worker** | **Render.com** | 100% Free (750 ঘণ্টা/মাস) | [render.com](https://render.com) |
| **Admin Web Portal** | **Vercel** | 100% Free (আনলিমিটেড ব্যান্ডউইথ) | [vercel.com](https://vercel.com) |
| **Mobile App (APK)** | **Expo EAS Build** | 100% Free (30 builds/month) | [expo.dev](https://expo.dev) |
| **Keep-Alive Pinger** | **cron-job.org** | 100% Free | [cron-job.org](https://cron-job.org) |

---

## ধাপ ১: ফ্রি ক্লাউড PostgreSQL ডাটাবেস সেটআপ (Neon.tech)

আমাদের প্রোডাকশন ব্যাকএন্ডের জন্য একটি ক্লাউড ডাটাবেস প্রয়োজন যাতে সার্ভার রিস্টার্ট হলেও ডেটা ডিলিট না হয়।

1. [https://neon.tech](https://neon.tech)-এ গিয়ে একটি ফ্রি অ্যাকাউন্ট খুলুন (GitHub বা Google দিয়ে)।
2. **"Create Project"**-এ ক্লিক করে প্রজেক্টের নাম দিন (যেমন: `bornoverse-db`)।
3. প্রজেক্ট তৈরি হলে ড্যাশবোর্ডে **"Connection Details"** দেখতে পাবেন।
4. ড্রপডাউন থেকে **`AsyncPG`** বা **`Parameters only`** সিলেক্ট করে কানেকশন স্ট্রিংটি কপি করুন:
   ```text
   postgresql+asyncpg://username:password@ep-cool-sample.ap-southeast-1.aws.neon.tech/bornoverse?sslmode=require
   ```
5. **লোকাল কম্পিউটার থেকে ডাটাবেস মাইগ্রেশন রান করা (One-time):**  
   আপনার কম্পিউটারের `platform-api` ফোল্ডারে গিয়ে টার্মিনালে নিচের কমান্ডটি চালান (নতুন ক্লাউড ডিবিতে টেবিল ও ডামি ডেটা তৈরি করার জন্য):
   ```powershell
   cd "d:\Academic Projects\3-2\CSE3200SystemProject\BornoVerse\platform-api"
   
   # ১. ক্লাউড ডিবি এনভায়রনমেন্ট সেট করুন
   $env:DATABASE_URL = "postgresql+asyncpg://username:password@ep-cool-sample.ap-southeast-1.aws.neon.tech/bornoverse?sslmode=require"
   
   # ২. টেবিলগুলো তৈরি করুন
   .\.venv\Scripts\python.exe -m alembic upgrade head
   
   # ৩. ডামি অডিওবুক এবং টেস্ট ইউজার লোড করুন
   .\.venv\Scripts\python.exe -m app.seed_data
   ```

---

## ধাপ ২: ব্যাকএন্ড API ও AI সার্ভিস ডিপ্লয় (Render.com)

Render.com-এ পাইথন FastAPI ব্যাকএন্ড এবং ব্যাকগ্রাউন্ড জেনারেশন ওয়ার্কার একই সার্ভারে চলবে।

### ২.১ গিটহাবে কোড পুশ করা
প্রথমে আপনার কোড গিটহাব রিপোজিটরিতে পুশ করে নিন:
```bash
git add .
git commit -m "Configure production cloud deployment"
git push origin main
```

### ২.২ Render-এ Web Service তৈরি করা
1. [https://render.com](https://render.com)-এ লগইন করে **"New +"** বাটনে ক্লিক করে **"Web Service"** সিলেক্ট করুন।
2. আপনার GitHub রিপোজিটরিটি (`BornoVerse`) কানেক্ট করুন।
3. ফর্মটিতে নিচের তথ্যগুলো দিন:
   * **Name:** `bornoverse-api`
   * **Region:** `Singapore (Southeast Asia)` *(বাংলাদেশ থেকে সবচেয়ে কম ল্যাটেন্সি পাওয়ার জন্য)*
   * **Root Directory:** `platform-api`
   * **Runtime:** `Python 3`
   * **Build Command:**
     ```bash
     pip install -r requirements.txt && chmod +x start.sh
     ```
   * **Start Command:**
     ```bash
     ./start.sh
     ```
   * **Instance Type:** `Free`

### ২.৩ Environment Variables কনফিগার করা
একই পেজের নিচে **"Environment Variables"** সেকশনে নিচের কীগুলো যোগ করুন:

| Variable Key | Value (মান) | বিবরণ |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@ep-xyz.neon.tech/bornoverse?sslmode=require` | ধাপ ১ এ Neon থেকে পাওয়া কানেকশন URL |
| `ENVIRONMENT` | `staging` | প্রোডাকশন চেক বাইপাস রাখার জন্য |
| `JWT_SECRET_KEY` | `bornoverse-super-secure-production-jwt-token-key-2026` | টোকেন সিকিউরিটি কি (কমপক্ষে ৩২ ক্যারেক্টার) |
| `GEMINI_API_KEY` | `<your-gemini-api-key>` | আপনার জেমিনি এআই এপিআই কি |
| `TTS_SERVICE_KEY` | `bornoverse-secure-tts-internal-key-2026` | ওয়ার্কার ও টিটিএস ইন্টারনাল অথ কি |
| `ALLOWED_ORIGINS` | `*` | সব ক্লায়েন্ট থেকে রিকোয়েস্ট অনুমোদনের জন্য |
| `MOCK_PAYMENTS_ENABLED`| `false` | বিকাশ গেটওয়ে ট্রানজেকশন সিমুলেশন |

4. সবশেষে নিচে **"Create Web Service"** বাটনে ক্লিক করুন!
5. Render ৩–৫ মিনিটের মধ্যে ডিপ্লয় সম্পন্ন করবে এবং আপনাকে লাইভ URL দিবে:
   ```text
   https://bornoverse-api.onrender.com
   ```
   *(ব্রাউজারে `https://bornoverse-api.onrender.com/docs` ওপেন করে Swagger API ড্যাশবোর্ড সরাসরি লাইভ দেখতে পাবেন!)*

---

## ধাপ ৩: অ্যাডমিন ওয়েব পোর্টাল ডিপ্লয় (Vercel)

অ্যাডমিন প্যানেলটি Vite + React দিয়ে তৈরি, যা Vercel-এ শূন্য খরচে বিশ্বমানের স্পিডে চলে।

1. [https://vercel.com](https://vercel.com)-এ গিয়ে লগইন করুন।
2. **"Add New..." -> "Project"** সিলেক্ট করুন।
3. আপনার গিটহাব রিপোজিটরিটি ইমপোর্ট করুন।
4. কনফিগারেশনে নিচের ফিল্ডগুলো সেট করুন:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `admin` *(Edit বাটনে ক্লিক করে `admin` ফোল্ডার সিলেক্ট করুন)*
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. **[admin/vercel.json](file:///d:/Academic%20Projects/3-2/CSE3200SystemProject/BornoVerse/admin/vercel.json)** ফাইলে আপনার রেন্ডার ব্যাকএন্ডের URL আপডেট করে দিন:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://bornoverse-api.onrender.com/api/$1"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
6. **"Deploy"** বাটনে ক্লিক করুন। ১ মিনিটের মধ্যে অ্যাডমিন লাইভ হয়ে যাবে:
   ```text
   https://bornoverse-admin.vercel.app
   ```

---

## ধাপ ৪: মোবাইল অ্যাপ কানেক্ট ও APK বিল্ড (Expo EAS)

এখন আপনার মোবাইল অ্যাপটিকে ক্লাউড সার্ভারের সাথে কানেক্ট করতে হবে:

1. **মোবাইল কনফিগারেশন আপডেট ([app/.env](file:///d:/Academic%20Projects/3-2/CSE3200SystemProject/BornoVerse/app/.env)):**  
   `app` ফোল্ডারে `.env` ফাইল খুলুন (না থাকলে তৈরি করুন) এবং লাইভ ক্লাউড ব্যাকএন্ড বসিয়ে দিন:
   ```env
   EXPO_PUBLIC_API_URL=https://bornoverse-api.onrender.com
   ```
2. **স্ট্যান্ডঅ্যালোন APK বিল্ড করা:**  
   প্রজেক্টের রুট ফোল্ডার থেকে আমাদের তৈরি করা স্ক্রিপ্টটি চালান:
   ```powershell
   .\build-apk.bat
   ```
   অথবা সরাসরি টার্মিনালে:
   ```bash
   cd app
   npx eas-cli build -p android --profile preview
   ```
3. বিল্ড শেষ হলে টার্মিনালে আসা ডাউনলোড লিংক বা QR কোড থেকে **BornoVerse.apk** আপনার ফোনে ইনস্টল করে নিন। 
4. **ম্যাজিক:** আপনার পিসি বন্ধ থাকলেও ফোন থেকে যেকোনো ওয়াইফাই বা মোবাইল ইন্টারনেট দিয়ে অ্যাপটি সবসময় কাজ করবে!

---

## ধাপ ৫: Render ফ্রি সার্ভারকে ২৪/৭ সচল রাখা (Keep-Alive Setup)

### সমস্যা:
Render-এর ফ্রি টায়ারে একটানা ১৫ মিনিট কোনো রিকোয়েস্ট না আসলে সার্ভার ঘুমিয়ে পড়ে (Sleep Mode)। ফলে ১৫ মিনিট পর প্রথমবার অ্যাপ খুললে লোড হতে ৩০–৪০ সেকেন্ড দেরি হয়।

### সমাধান (১ মিনিটে সেটআপ):
একটি ফ্রি অটোমেটিক পিংগার সার্ভারে প্রতি ১০ মিনিট পর পর রিকোয়েস্ট পাঠাবে, যাতে সার্ভার কখনো না ঘুমায়!

1. [https://cron-job.org](https://cron-job.org)-এ গিয়ে একটি ফ্রি অ্যাকাউন্ট খুলুন।
2. **"Create Cronjob"** বাটনে ক্লিক করুন:
   * **Title:** `BornoVerse Health Ping`
   * **URL:** `https://bornoverse-api.onrender.com/health`
   * **Schedule:** প্রতি `10 minutes` সিলেক্ট করুন।
3. **"Create"** বাটনে ক্লিক করুন।
4. **ফলাফল:** এখন প্রতি ১০ মিনিট পর পর Render-এর হেলথ এণ্ডপয়েন্টে পিং যাবে এবং আপনার ক্লাউড সার্ভার দিন-রাত ২৪ ঘণ্টা সম্পূর্ণ জাগ্রত ও ইনস্ট্যান্ট ফাস্ট থাকবে!

---

## পরিবেশ ভেরিয়েবল চেকলিস্ট (Environment Variables Reference)

```dotenv
# ==============================================================================
# BornoVerse Cloud Environment Configuration
# ==============================================================================

# Backend (FastAPI / Render)
ENVIRONMENT=staging
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql+asyncpg://<username>:<password>@<neon-host>/bornoverse?sslmode=require
JWT_SECRET_KEY=bornoverse-super-secure-production-jwt-token-key-2026
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=*
MOCK_PAYMENTS_ENABLED=false

# Gemini AI Service
GEMINI_API_KEY=<your-gemini-api-key>
TTS_SERVICE_KEY=bornoverse-secure-tts-internal-key-2026
TTS_EXTRACT_URL=http://localhost:8001/extract-page
TTS_GENERATE_URL=http://localhost:8001/generate

# Mobile Client (Expo / EAS)
EXPO_PUBLIC_API_URL=https://bornoverse-api.onrender.com
```

---

## সাধারণ সমস্যা ও সমাধান (Troubleshooting & FAQs)

### ১. Neon ডাটাবেসে কানেক্ট করার সময় SSL Error দেখাচ্ছে?
* **সমাধান:** নিশ্চিত করুন আপনার কানেকশন স্ট্রিংটির শেষে `?sslmode=require` যুক্ত আছে। Neon ক্লাউড এনক্রিপ্টেড SSL রিকোয়েস্ট বাধ্যতামূলক করে।

### ২. Render ডিপ্লয়মেন্ট ফেইল করছে?
* **সমাধান:** Render ড্যাশবোর্ডের **Logs** ট্যাবে চেক করুন। 
  * নিশ্চিত করুন Build Command এ `pip install -r requirements.txt && chmod +x start.sh` দেওয়া আছে।
  * Start Command এ `./start.sh` দেওয়া আছে।

### ৩. ফোনে অডিও প্লে হতে দেরি হচ্ছে?
* **সমাধান:** প্রথমবার কোনো নতুন PDF আপলোড করলে ব্যাকগ্রাউন্ডে Gemini AI টেক্সট এক্সট্র্যাক্ট করে অডিও সিন্থেসিস করতে ৩০–৬০ সেকেন্ড সময় নেয়। প্রসেস শেষ হলে চ্যাপ্টারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে `READY` হয়ে যাবে এবং প্লেয়ারে অডিও বাজবে।

### ৪. অ্যাডমিন প্যানেলে লগইন করার পর CORS Error দিচ্ছে?
* **সমাধান:** Render-এর Environment Variables-এ `ALLOWED_ORIGINS` ফিল্ডে `*` দিন অথবা আপনার ভেরসেল ফ্রন্টএন্ড URL যোগ করুন (যেমন: `https://bornoverse-admin.vercel.app`)।

---

🎉 **অভিনন্দন!** এখন আপনার পুরো সিস্টেম (Database, Backend API, Generation Worker, Admin Portal, এবং Mobile APK) সম্পূর্ণ ফ্রিতে ক্লাউডে স্বয়ংক্রিয়ভাবে চলছে!
