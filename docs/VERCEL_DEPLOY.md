# Деплой на Vercel

## 1. Подключение репозитория

1. Зайдите на [vercel.com](https://vercel.com) и войдите (GitHub/GitLab/Bitbucket).
2. **Add New** → **Project** → выберите репозиторий `travel_copilot2`.
3. **Framework Preset**: Next.js (определяется автоматически).
4. **Build Command**: `prisma generate && next build` (или оставьте по умолчанию — в проекте есть `postinstall: prisma generate`).
5. **Environment Variables**: при необходимости добавьте переменные из `.env.example` (например `DATABASE_URL` для Vercel Postgres или оставьте пустым для SQLite при первом запуске).
6. Нажмите **Deploy**.

## 2. Деплой через CLI

```bash
npm i -g vercel
cd travel_copilot2
npm install
vercel
```

Следуйте подсказкам (логин, выбор/создание проекта). После деплоя в терминале появится ссылка вида `https://travel-copilot2-xxx.vercel.app`.

## 3. Production Build локально

```bash
npm install
npm run build
npm run start
```

**Важно:** приложение слушает порт **3002**, а не 3000. Открывайте в браузере:

**http://localhost:3002**

Если открыть `http://localhost:3000`, страница будет пустой (сервер там не запущен).

---

После успешного деплоя ссылка на сайт будет в дашборде Vercel и в письме/терминале.
