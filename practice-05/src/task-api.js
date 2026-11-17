import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

// Проверяет и нормализует фильтры до запроса. Ошибка вызывающего кода — TypeError.
function normalizeFilters(filters) {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Фильтры должны быть объектом");
  }

  const query = {};
  for (const [name, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(name)) {
      throw new TypeError(`Неизвестный фильтр: ${name}`);
    }
    if (value === undefined) continue;

    if (name === "completed") {
      if (typeof value !== "boolean") throw new TypeError("completed должен быть true или false");
      query.completed = value; // false остаётся логическим значением
    } else if (name === "priority") {
      if (!ALLOWED_PRIORITIES.has(value)) throw new TypeError("priority должен быть low, medium или high");
      query.priority = value;
    } else if (name === "categoryId") {
      if (!isPositiveSafeInteger(value)) throw new TypeError("categoryId должен быть положительным целым числом");
      query.categoryId = value;
    } else if (name === "q") {
      if (typeof value !== "string") throw new TypeError("q должен быть строкой");
      const q = value.trim();
      if (q.length > 100) throw new TypeError("q должен быть не длиннее 100 символов");
      query.q = q;
    }
  }
  return query;
}

// Проверяет коллекцию { data: [...], meta: { total } } и уникальность id.
function checkCollection(payload, isItem, label) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw invalidResponse(`Ответ ${label}: поле data должно быть массивом`);
  }
  const ids = new Set();
  for (const item of payload.data) {
    if (!isItem(item)) {
      throw invalidResponse(`Ответ ${label}: элемент не соответствует схеме`);
    }
    if (ids.has(item.id)) {
      throw invalidResponse(`Ответ ${label}: повторяющийся id ${item.id}`);
    }
    ids.add(item.id);
  }
  const { meta } = payload;
  if (!meta || typeof meta !== "object" || meta.total !== payload.data.length) {
    throw invalidResponse(`Ответ ${label}: meta.total не совпадает с длиной data`);
  }
  return payload;
}

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("createTaskApi ожидает клиент с методом requestJson");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    const { data, meta } = checkCollection(payload, isTask, "списка задач");
    return { tasks: data, meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным целым числом");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (!payload || typeof payload !== "object" || !isTask(payload.data)) {
      throw invalidResponse("Ответ задачи не соответствует схеме");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return checkCollection(payload, isCategory, "списка категорий").data;
  }

  async function loadInitialData(filters = {}) {
    // Оба запроса начинаются до общего ожидания.
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [{ tasks, meta }, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks, categories, meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
