import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
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

export function isCategory(value) {
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
    if (!ALLOWED_FILTERS.has(name)) throw new TypeError(`Неизвестный фильтр: ${name}`);
    if (value === undefined) continue;
    if (name === "completed") {
      if (typeof value !== "boolean") throw new TypeError("completed должен быть true или false");
      query.completed = value;
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

function checkId(id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError("id задачи должен быть положительным целым числом");
  }
}

function checkPlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} должен быть объектом`);
  }
}

// Проверяет коллекцию { data: [...], meta: { total } } и уникальность id.
function checkCollection(payload, isItem, label) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw invalidResponse(`Ответ ${label}: поле data должно быть массивом`);
  }
  const ids = new Set();
  for (const item of payload.data) {
    if (!isItem(item)) throw invalidResponse(`Ответ ${label}: элемент не соответствует схеме`);
    if (ids.has(item.id)) throw invalidResponse(`Ответ ${label}: повторяющийся id ${item.id}`);
    ids.add(item.id);
  }
  const { meta } = payload;
  if (!meta || typeof meta !== "object" || meta.total !== payload.data.length) {
    throw invalidResponse(`Ответ ${label}: meta.total не совпадает с длиной data`);
  }
  return payload;
}

function checkSingleTask(payload) {
  if (!payload || typeof payload !== "object" || !isTask(payload.data)) {
    throw invalidResponse("Ответ задачи не соответствует схеме");
  }
  return payload.data;
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
// Последний аргумент каждого метода данных — { signal }.
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("createTaskApi ожидает клиент с методом requestJson");
  }

  async function getTasks(filters = {}, { signal } = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, signal });
    const { data, meta } = checkCollection(payload, isTask, "списка задач");
    return { tasks: data, meta };
  }

  async function getTaskById(id, { signal } = {}) {
    checkId(id);
    return checkSingleTask(await client.requestJson(`/tasks/${id}`, { signal }));
  }

  async function getCategories({ signal } = {}) {
    const payload = await client.requestJson("/categories", { signal });
    return checkCollection(payload, isCategory, "списка категорий").data;
  }

  async function loadInitialData(filters = {}, options = {}) {
    // Оба запроса начинаются до общего ожидания.
    const [{ tasks, meta }, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);
    return { tasks, categories, meta };
  }

  // id и completed назначает сервер, поэтому в тело попадают только три поля.
  // Значения полей проверяет сервер (клиентская форма проверяется в form-validation.js).
  async function createTask(draft, { signal } = {}) {
    checkPlainObject(draft, "draft");
    const { title, priority, categoryId } = draft;
    const payload = await client.requestJson("/tasks", {
      method: "POST",
      body: { title, priority, categoryId },
      signal,
    });
    return checkSingleTask(payload);
  }

  async function updateTask(id, changes, { signal } = {}) {
    checkId(id);
    checkPlainObject(changes, "changes");
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: { ...changes },
      signal,
    });
    return checkSingleTask(payload);
  }

  async function setTaskCompleted(id, completed, { signal } = {}) {
    checkId(id);
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть true или false");
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: { completed },
      signal,
    });
    return checkSingleTask(payload);
  }

  async function deleteTask(id, { signal } = {}) {
    checkId(id);
    const payload = await client.requestJson(`/tasks/${id}`, { method: "DELETE", signal });
    if (payload !== null) {
      throw invalidResponse("После удаления ожидался ответ 204 без тела");
    }
    return null;
  }

  async function resetDemoData({ signal } = {}) {
    const payload = await client.requestJson("/debug/reset", { method: "POST", signal });
    const data = payload?.data;
    if (!data || data.reset !== true || !Number.isSafeInteger(data.total) || data.total < 0) {
      throw invalidResponse("Ответ сброса не соответствует схеме");
    }
    return data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
