import { ApiError } from './errors.js';

const PRIORITIES = ['low', 'medium', 'high'];
const EDITABLE = ['title', 'priority', 'categoryId', 'completed'];

// categoryIds — Set существующих id категорий.
// Возвращает НОВЫЙ объект только с нормализованными разрешёнными полями.
// partial=false (POST): title, priority, categoryId обязательны; completed/id запрещены.
// partial=true (PATCH): хотя бы одно из title, priority, categoryId, completed; id запрещён.
export function validateTaskInput(value, { partial = false, categoryIds } = {}) {
  // Object.create(null): ключ "__proto__" из тела сохраняется как обычное поле ошибки.
  const details = Object.create(null);
  const fail = () => {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Данные задачи не прошли проверку.', details);
  };

  // Тело должно быть JSON-объектом, а не массивом, строкой, числом, boolean или null.
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    details.body = 'Тело запроса должно быть JSON-объектом.';
    fail();
  }

  const has = key => Object.hasOwn(value, key);
  const result = {};

  // Запрещённые и неизвестные поля — ошибка по каждому имени.
  for (const key of Object.keys(value)) {
    if (key === 'id') details.id = 'id назначает сервер, передавать его нельзя.';
    else if (key === 'completed' && !partial) details.completed = 'При создании статус задаёт сервер.';
    else if (!EDITABLE.includes(key)) details[key] = `Неизвестное поле: ${key}.`;
  }

  // title: строка, после trim от 1 до 100 символов.
  if (has('title')) {
    if (typeof value.title !== 'string') details.title = 'Название должно быть строкой.';
    else {
      const title = value.title.trim();
      if (title.length === 0) details.title = 'Название не должно быть пустым.';
      else if (title.length > 100) details.title = 'Название должно быть не длиннее 100 символов.';
      else result.title = title;
    }
  } else if (!partial) details.title = 'Название обязательно.';

  if (has('priority')) {
    if (!PRIORITIES.includes(value.priority)) details.priority = 'Приоритет: low, medium или high.';
    else result.priority = value.priority;
  } else if (!partial) details.priority = 'Приоритет обязателен.';

  // categoryId: именно число (строку '2' не преобразуем) и существующая категория.
  if (has('categoryId')) {
    const id = value.categoryId;
    if (!Number.isSafeInteger(id) || id <= 0) details.categoryId = 'categoryId должен быть положительным целым числом.';
    else if (!categoryIds?.has(id)) details.categoryId = 'Неизвестная категория.';
    else result.categoryId = id;
  } else if (!partial) details.categoryId = 'Категория обязательна.';

  if (partial && has('completed')) {
    if (typeof value.completed !== 'boolean') details.completed = 'completed должен быть true или false.';
    else result.completed = value.completed;
  }

  // PATCH без единого изменяемого поля запрещён.
  if (partial && !EDITABLE.some(has) && Object.keys(details).length === 0) {
    details.body = 'Нужно передать хотя бы одно поле: title, priority, categoryId или completed.';
  }

  if (Object.keys(details).length > 0) fail();
  return result;
}
