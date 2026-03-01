# Импорт отелей и рейсов в БД

Данные по отелям и рейсам хранятся в SQLite (таблицы `Hotel`, `Flight`, `Train`). Наполнение сидом — базовое; для большого объёма можно:

1. **Ручной JSON** — положите файл `data/offers.json` в формате:
   ```json
   {
     "hotels": [{ "city": "Москва", "name": "Отель", "stars": 4, "pricePerNightRub": 10000, "amenities": "...", "imageUrl": "https://..." }],
     "flights": [{ "origin": "Москва", "destination": "Сочи", "departureAt": "2025-06-01 08:00", "arrivalAt": "2025-06-01 10:30", "carrier": "S7", "flightNumber": "S7 123", "priceRub": 8000, "direct": true, "imageUrl": "https://..." }],
     "trains": [{ "origin": "Москва", "destination": "СПб", "departureAt": "23:00", "arrivalAt": "07:00", "carrier": "РЖД", "priceRub": 3000 }]
   }
   ```
   и запустите `npx tsx scripts/import-offers.ts` (скрипт можно добавить по этому описанию).

2. **Парсинг платформ** — для автоматического парсинга (Aviasales, Hotellook, Туту.ру и т.п.) нужны отдельные скрипты под их API или HTML. Структура БД уже готова: `Hotel.imageUrl`, `Flight.imageUrl` для картинок из открытых источников (например, Unsplash по названию города).

3. **Расширение сида** — в `prisma/seed.ts` можно дописать десятки/сотни записей `createMany` для отелей и рейсов по разным городам и датам.
