# Практическая работа № 9 — отчёт

**Тема:** Создание собственного HTTP API

- ФИО: Бачинский Даниэль Денисович
- Группа: ЭФБО-06-25
- Вариант: 4 (`?priority=medium`)
- Node.js / npm: v24.21.0 / 11.19.0
- Коммит сдаваемой версии: «feat: add practice 09 express read api» в ветке `main`

## Цель и результат

**Цель:** разобраться, как Express-сервер принимает запрос, выбирает обработчик, проверяет параметры и формирует ответ.

**Результат:** собственный сервер на Express 5.1.0 отдаёт health, категории, список задач с фильтрами и отдельную задачу. Неверные, повторяющиеся и неизвестные параметры дают 400, неверный id — 400, отсутствующая задача — 404, неизвестный путь — 404, другие методы на известных путях — 405 с `Allow`. HEAD и OPTIONS работают, CORS-заголовки есть. Данные хранятся в памяти процесса и при чтении не меняются. Проходят 90/90 проверок.

## Установка и запуск

Команды выполняются из папки `practice-09`:

```bash
npm ci
npm start
```

API: http://127.0.0.1:5505/api. Проверка окружения: `/api/health` → `{"data":{"status":"ok"}}`. При запуске сервер пишет «API ПР9: http://127.0.0.1:5505/api».

Другой порт: `npm start -- 5515`. Режим разработки: `npm run dev`. `.env` не использовался.

## Реализация

| Модуль | Обязанности |
|---|---|
| `validation.js` | `parsePositiveId` — строка по `/^[1-9]\d*$/` и `Number.isSafeInteger`, иначе `null`. `parseFilters` — проверка имён, повторов и значений query; ошибка — `ApiError(400, 'INVALID_QUERY')`. Не знает про `req`/`res`. |
| `task-service.js` | `selectTasks` — фильтры через И, поиск `toLocaleLowerCase('ru-RU')`, новый массив без мутации. `findTask` — поиск по полю `id`, а не по индексу, или `null`. |
| `store.js` | Копии данных для конкретного экземпляра приложения (готовый). |
| `routes.js` | Связь HTTP с логикой: разбор `req.originalUrl`, вызов `store`, формат `{ data, meta }`, ошибки 400/404/405. |
| `app.js` | Сборка middleware и Router без открытия порта (готовый). |
| `server.js` | Порт и запуск (готовый). |

**false.** `completed` принимается только как строки `'true'`/`'false'` и превращается в boolean сравнением `raw === 'true'`. В `selectTasks` «нет ограничения» — это `null`, поэтому условие `filters.completed === null || task.completed === filters.completed` корректно пропускает `false` (в отличие от `if (filters.completed)`).

**Повторы query.** Параметры не превращаются в обычный объект: сначала проверяются имена через `searchParams.keys()`, затем `searchParams.getAll(name).length > 1` для каждого из четырёх имён. Только после этого читаются значения.

**id.** Одного `parseInt` недостаточно (`'4abc'` → 4). Регулярное выражение отсекает `0`, `-1`, `01`, `1.5`, `1e2`, пробелы; `Number.isSafeInteger` — слишком большие числа.

**Порядок middleware:** общие заголовки и ранний OPTIONS → Router (GET-маршруты, затем `router.all` с 405) → 404 `ROUTE_NOT_FOUND` → обработчик ошибок с четырьмя параметрами.

## Контракт

| Маршрут | Ответ |
|---|---|
| `GET /api/health` | 200 `{ data: { status: "ok" } }` |
| `GET /api/categories` | 200 `{ data: category[], meta: { total } }` |
| `GET /api/tasks` | 200 `{ data: task[], meta: { total, filters } }` |
| `GET /api/tasks/:id` | 200 `{ data: task }`, 400 `INVALID_ID`, 404 `TASK_NOT_FOUND` |
| `HEAD` тех же путей | как GET, без тела |
| `OPTIONS` любого пути | 204, CORS |
| Другие методы на этих путях | 405 `METHOD_NOT_ALLOWED`, `Allow: GET, HEAD, OPTIONS` |

Успешный ответ (`GET /api/tasks/4`):

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{"data":{"id":4,"title":"Подготовить модель задач","completed":false,"priority":"high","categoryId":2}}
```

Ошибки:

```text
GET /api/tasks/4abc   → 400 {"error":{"code":"INVALID_ID","message":"Некорректный идентификатор задачи."}}
GET /api/tasks/2      → 404 {"error":{"code":"TASK_NOT_FOUND","message":"Задача не найдена.","details":{"id":2}}}
POST /api/tasks       → 405 Allow: GET, HEAD, OPTIONS
                        {"error":{"code":"METHOD_NOT_ALLOWED","message":"Метод POST не поддерживается для этого пути."}}
```

`meta.total` — размер полученной выборки, а не всего хранилища (без фильтров 12, с `priority=medium` 4).

**Граница ПР9 и ПР10.** В ПР9 сервер только читает: POST, PATCH и DELETE получают 405 — это проверяет тест «POST /api/tasks: 405 и Allow». Создание задач и проверка тела запроса относятся к ПР10.

## Индивидуальный вариант

| Запрос | Ожидаемые статус и данные | Фактический результат |
|---|---|---|
| `GET /api/tasks?priority=medium` | 200, id 1, 10, 19, 28 | 200, id `[1, 10, 19, 28]`, `meta.total: 4`, `filters: {"completed":null,"priority":"medium","categoryId":null,"q":""}` |
| `GET /api/tasks?priority=medium&priority=medium` | 400 `INVALID_QUERY` | 400 `{"error":{"code":"INVALID_QUERY","message":"Параметр priority указан несколько раз."}}` — повтор запрещён даже с одинаковым значением |
| `GET /api/tasks/19` (из выборки) | 200, задача 19 | 200 `{"data":{"id":19,"title":"Описать контракт запросов","completed":false,"priority":"medium","categoryId":3}}` |
| `GET /api/tasks/2` (отсутствующий id) | 404 `TASK_NOT_FOUND` | 404 `{"error":{"code":"TASK_NOT_FOUND","message":"Задача не найдена.","details":{"id":2}}}` — id 2 корректен, но такой записи нет (id разреженные) |

## Автоматические проверки

```bash
npm run check:unit
npm run check:api
npm test
```

| Набор | Успешно | Неуспешно | Примечание |
|---|---|---|---|
| Модульные | 38 | 0 | `ℹ tests 38 · pass 38 · fail 0` |
| HTTP | 52 | 0 | `ℹ tests 52 · pass 52 · fail 0` |

`npm test`: `ℹ tests 90 · pass 90 · fail 0`. Исходная заготовка: `pass 7, fail 83`, как указано в методичке.

## Ручной протокол

Запросы `curl -i` к серверу на 5505:

| № | Запрос | Ожидаемый результат | Фактический результат |
|---:|---|---|---|
| 1 | `GET /api/health` | 200, `ok` | 200 `{"data":{"status":"ok"}}` |
| 2 | `GET /api/categories` | 200, 3 категории | 200, Учёба / Проект / Организация, `total: 3` |
| 3 | `GET /api/tasks` | 200, 12 задач, фильтры по умолчанию | 200, 12 задач, `filters: {completed:null, priority:null, categoryId:null, q:""}` |
| 4 | `GET /api/tasks?priority=medium` | id и total по таблице | `[1, 10, 19, 28]`, total 4 |
| 5 | `GET /api/tasks?q=xyz` | 200, `[]`, total 0 | 200 `{"data":[],"meta":{"total":0,…}}` |
| 6 | `GET /api/tasks/4` | Задача с id 4 | «Подготовить модель задач», id 4 |
| 7 | `GET /api/tasks/2`, `/api/tasks/4abc` | 404 и 400, разные коды | 404 `TASK_NOT_FOUND`, 400 `INVALID_ID` |
| 8 | `?sort=id`, `?priority=medium&priority=medium` | 400 `INVALID_QUERY` | Оба 400 `INVALID_QUERY` |
| 9 | `POST /api/tasks` | 405, Allow, число задач не меняется | 405, `Allow: GET, HEAD, OPTIONS`; `GET /api/tasks` по-прежнему 12 |
| 10 | `GET /api/unknown` | 404 `ROUTE_NOT_FOUND` в JSON | 404 `{"error":{"code":"ROUTE_NOT_FOUND",…}}` |
| 11 | `curl -I /api/tasks` (HEAD) | 200, JSON-заголовки, без тела | 200, `Content-Type: application/json; charset=utf-8`, тело пустое |
| 12 | `OPTIONS /api/tasks` | 204, CORS, без тела | 204, `Access-Control-Allow-Origin: *`, тело пустое |
| 13 | Остановить и запустить заново | Исходные данные | После перезапуска `meta.total = 12` |

Дополнительно: `GET /api/tasks?completed=true` → 200, только выполненные задачи `[1, 10, 16, 25, 31]`, `meta.total: 5`, `filters.completed: true`.

Чтение из браузерного клиента ПР8 не выполнялось — для оценки ПР9 оно необязательно.

## Исправленный дефект

**Симптом.** Если зарегистрировать `router.all([...], …)` с ответом 405 **до** GET-маршрутов, все GET-запросы к `/health`, `/categories`, `/tasks` получают 405. Я воспроизвёл это, временно переставив блок: `npm run check:api` дал **pass 10, fail 42** (упали «Health: 200», «Категории», «Выборка completed=false» и др.).

**Причина.** Express выполняет обработчики в порядке регистрации, а `router.all` совпадает с любым методом, включая GET, и завершает обработку.

**Исправление.** `router.all` стоит **после** всех `router.get`. Повторная проверка: `npm test` — 90/90.

## Контрольные вопросы

1. **Node.js и браузер.** В Node.js нет DOM, `window`, `localStorage`; есть доступ к сети, файлам и процессу.
2. **Выбор маршрута** — по методу и пути; query в путь не входит.
3. **`req.params`** — части пути (`/tasks/:id`), query — параметры после `?`.
4. **`'false'`** — непустая строка, `Boolean('false') === true`; нужно сравнение `raw === 'true'`.
5. **Проверка всего id** — `parseInt('4abc')` даёт 4; `isSafeInteger` отсекает числа, теряющие точность.
6. **200 и 404.** Пустая выборка — корректный ответ «совпадений нет»; 404 — нет запрошенного ресурса.
7. **`TASK_NOT_FOUND` и `ROUTE_NOT_FOUND`** — первый: путь верный, записи нет; второй: такого пути нет.
8. **405 и 404.** 405 — путь есть, метод нельзя; `Allow` сообщает разрешённые методы.
9. **`meta.total`** — число задач в выборке после фильтров.
10. **Порядок middleware** определяет, кто первым ответит (см. дефект выше).
11. **Четыре параметра** `(error, req, res, next)` — так Express отличает обработчик ошибок от обычного middleware.
12. **Фабрика `createApp`** позволяет тестам поднять отдельный сервер на свободном порту и закрыть его.
13. **При внутренней ошибке** — только код `INTERNAL_ERROR` и общее сообщение, без стека и данных.
14. **CORS** — правило браузера, кому показывать ответ; прямые HTTP-запросы он не запрещает и не проверяет пользователя.
15. **ПР10:** добавить POST/PATCH/DELETE, проверку тела, расширить `Allow` и CORS-методы, `/debug/reset`.

## Вывод

Реализованы `validation.js`, `task-service.js` и `routes.js`: чтение задач и категорий, фильтры, проверка id и query, ошибки 400/404/405 в едином JSON-формате. Подтверждено 90/90 автоматических проверок и ручным протоколом 1–13 через `curl`. Ограничения: только чтение и данные в памяти; запись — в ПР10.
