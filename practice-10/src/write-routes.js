import { ApiError } from './errors.js';
import { jsonBody } from './json-body.js';
import { requireTask } from './task-resource.js';
import { validateTaskInput } from './task-validation.js';

const categoryIdsOf = store => new Set(store.listCategories().map(category => category.id));

export function registerWriteRoutes(router, store) {
  // POST /api/tasks: jsonBody (415/400 INVALID_JSON/413) → валидация → создание.
  router.post('/tasks', ...jsonBody, (req, res) => {
    // Неверное тело → ApiError(400, 'VALIDATION_ERROR', ..., details) → errorHandler.
    const value = validateTaskInput(req.body, { categoryIds: categoryIdsOf(store) });
    const task = store.createTask(value);
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  // Сначала проверяются id и существование записи, потом тело.
  router.patch('/tasks/:id', requireTask(store), ...jsonBody, (req, res) => {
    const changes = validateTaskInput(req.body, { partial: true, categoryIds: categoryIdsOf(store) });
    const task = store.updateTask(req.task.id, changes);
    if (task === null) throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id: req.task.id });
    res.json({ data: task });
  });

  router.delete('/tasks/:id', requireTask(store), (req, res) => {
    if (!store.deleteTask(req.task.id)) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id: req.task.id });
    }
    res.status(204).end();
  });
}
