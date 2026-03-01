# Быстрый деплой (максимально быстро)

## Вариант 1: Vercel (рекомендуется)

### Через сайт (3 минуты)

1. Зайди на **[vercel.com](https://vercel.com)** → войди через GitHub.
2. **Add New** → **Project** → выбери репозиторий `travel_copilot2` (или загрузи папку).
3. Оставь настройки по умолчанию (Next.js, `prisma generate && next build` уже в `vercel.json`).
4. **Environment Variables** (по желанию, для бота и поиска):
   - `DATABASE_URL` — для Vercel Postgres или оставь пустым (будет SQLite/без БД).
   - `OPENROUTER_API_KEY` и `LLM_PROVIDER=openrouter` — чтобы копилот отвечал через LLM.
   - `NEXT_PUBLIC_APP_URL` — укажи свой домен после деплоя, например `https://твой-проект.vercel.app`.
5. Нажми **Deploy**. Ссылка на сайт появится в дашборде.

### Через CLI (ещё быстрее)

```bash
cd travel_copilot2
npm i -g vercel
npm install
vercel
```

Логин по подсказкам → выбери/создай проект → получишь ссылку вида `https://travel-copilot2-xxx.vercel.app`.

---

## Вариант 2: Локальный production-запуск

```bash
cd travel_copilot2
npm install
npm run build
npm run start
```

Открывай **http://localhost:3002** (порт 3002, не 3000).

---

## Минимум переменных для работы бота

| Переменная | Зачем |
|------------|--------|
| `OPENROUTER_API_KEY` | Ответы копилота через LLM (OpenRouter). |
| `LLM_PROVIDER=openrouter` | По умолчанию уже openrouter. |
| `DATABASE_URL` | Нужна, если используешь Prisma/БД; для демо можно без неё. |
| `NEXT_PUBLIC_APP_URL` | URL приложения после деплоя (для ссылок и CORS). |

Остальные ключи (Duffel, Aviasales, SMS и т.д.) — по необходимости; без них поиск идёт по локальной БД/мокам.
