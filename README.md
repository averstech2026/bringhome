# BringHome — Умный список покупок

Семейное веб-приложение для совместных списков покупок с синхронизацией в реальном времени.

**Стек:** Vite + React + TailwindCSS + Firebase (Auth + Firestore)

## Быстрый старт

```bash
cp .env.example .env
# Заполните Firebase и AI ключи в .env

npm install
npm run dev
```

## Переменные окружения

| Переменная | Описание |
|---|---|
| `VITE_FIREBASE_*` | Конфиг Firebase из консоли проекта |
| `VITE_AI_API_KEY` | Ключ API (OpenAI, GigaChat proxy, YandexGPT и т.д.) |
| `VITE_AI_API_URL` | URL эндпоинта (по умолчанию OpenAI-compatible) |
| `VITE_AI_MODEL` | Модель (по умолчанию `gpt-4o-mini`) |

## Структура Firestore

### `lists`
```js
{
  title: "Домой 05.07",      // auto-generated
  type: "home" | "cottage",
  isPublic: false,
  createdBy: "uid",
  allowedUsers: ["uid"],
  createdAt: Timestamp
}
```

### `items`
```js
{
  listId: "...",
  name: "Молоко",
  quantity: "2 л",
  category: "Молочные продукты",
  checked: false,
  checkedBy: null,
  checkedAt: null
}
```

### `product_history`
```js
{ userId: "uid", name: "Молоко" }
```

## Деплой на GitHub Pages

**Автоматически:** при пуше в `main` срабатывает GitHub Actions (`.github/workflows/deploy.yml`).

1. В репозитории: **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Добавьте секреты **Settings → Secrets and variables → Actions** (имена как в `.env.example`: `VITE_FIREBASE_*`, `VITE_AI_*`)

**Вручную:**

```bash
npm run deploy
```

Затем в **Settings → Pages** выберите ветку `gh-pages` / папку `/ (root)`.

Роутинг через **HashRouter** — ссылки вида `https://user.github.io/bringhome/#/list/abc123`.

## Firebase Security Rules

Скопируйте `firestore.rules` в Firebase Console → Firestore → Rules.

## Структура проекта

```
src/
├── firebase.js           # Инициализация Firebase
├── hooks/                # useAuth, useList, useItems (onSnapshot)
├── services/             # listsService, aiService
├── components/
│   ├── auth/             # AuthGate
│   └── list/             # StatusBar, ItemRow, AddItemForm, AiInput...
├── pages/                # HomePage, ListPage
└── utils/                # groupByCategory, progress
```

## Функции MVP

- Email/Password + Google авторизация
- Создание списков «Домой» / «Дача»
- Real-time синхронизация галочек (`onSnapshot`)
- Группировка по категориям
- Плашка статуса (прогресс / «Готово к выходу»)
- ИИ-распознавание текста из чата (batch write)
- Автодополнение из `product_history`
- Шаринг: кнопка «Общий», добавление по UID, ссылка с автодоступом
