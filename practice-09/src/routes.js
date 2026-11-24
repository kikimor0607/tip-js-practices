import { Router } from 'express';
import { ApiError } from './errors.js';
import { parseFilters, parsePositiveId } from './validation.js';

const ALLOWED = 'GET, HEAD, OPTIONS';

export function createRouter(store) {
  const router = Router({ caseSensitive: true });
  router.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));

  router.get('/categories', (req, res) => {
    const data = store.listCategories();
    res.json({ data, meta: { total: data.length } });
  });

  // GET /api/tasks?completed=…&priority=…&categoryId=…&q=…
  router.get('/tasks', (req, res) => {
    // Query читается из полного URL: так видны повторяющиеся параметры.
    const { searchParams } = new URL(req.originalUrl, 'http://localhost');
    const filters = parseFilters(searchParams); // неверный query → ApiError 400 INVALID_QUERY
    const data = store.listTasks(filters);
    res.json({ data, meta: { total: data.length, filters } });
  });

  router.get('/tasks/:id', (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) throw new ApiError(400, 'INVALID_ID', 'Некорректный идентификатор задачи.');
    const task = store.getTask(id);
    if (task === null) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id });
    res.json({ data: task });
  });

  // Регистрируются после GET: остальные методы на известных путях → 405.
  router.all(['/health', '/categories', '/tasks', '/tasks/:id'], (req, res) => {
    res.set('Allow', ALLOWED);
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', `Метод ${req.method} не поддерживается для этого пути.`);
  });

  return router;
}
