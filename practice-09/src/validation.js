import { ApiError } from './errors.js';

const FILTER_NAMES = ['completed', 'priority', 'categoryId', 'q'];
const PRIORITIES = ['low', 'medium', 'high'];
const ID_PATTERN = /^[1-9]\d*$/; // без знака, ведущих нулей, точек, экспоненты и пробелов

// raw: строка; результат: безопасное положительное целое либо null.
export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !ID_PATTERN.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function invalidQuery(message) {
  return new ApiError(400, 'INVALID_QUERY', message);
}

// URLSearchParams -> { completed: boolean|null, priority: string|null,
// categoryId: number|null, q: string }. Ошибка: ApiError(400, 'INVALID_QUERY', ...).
export function parseFilters(searchParams) {
  // 1. Имена всех параметров (с учётом регистра).
  for (const name of searchParams.keys()) {
    if (!FILTER_NAMES.includes(name)) throw invalidQuery(`Неизвестный параметр: ${name}.`);
  }
  // 2. Каждое имя не более одного раза — getAll видит дубликаты.
  for (const name of FILTER_NAMES) {
    if (searchParams.getAll(name).length > 1) throw invalidQuery(`Параметр ${name} указан несколько раз.`);
  }

  // 3. Значения. Отсутствие параметра (null) и пустое значение ('') различаются.
  const filters = { completed: null, priority: null, categoryId: null, q: '' };

  const completed = searchParams.get('completed');
  if (completed !== null) {
    if (completed !== 'true' && completed !== 'false') throw invalidQuery('completed должен быть true или false.');
    filters.completed = completed === 'true'; // явное сравнение, не Boolean(строка)
  }

  const priority = searchParams.get('priority');
  if (priority !== null) {
    if (!PRIORITIES.includes(priority)) throw invalidQuery('priority должен быть low, medium или high.');
    filters.priority = priority;
  }

  const categoryId = searchParams.get('categoryId');
  if (categoryId !== null) {
    const value = parsePositiveId(categoryId);
    if (value === null) throw invalidQuery('categoryId должен быть положительным целым числом без ведущих нулей.');
    filters.categoryId = value;
  }

  const q = searchParams.get('q');
  if (q !== null) {
    const trimmed = q.trim();
    if (trimmed.length > 100) throw invalidQuery('q должен быть не длиннее 100 символов.');
    filters.q = trimmed;
  }

  // 4. Новый объект со всеми четырьмя полями.
  return filters;
}
