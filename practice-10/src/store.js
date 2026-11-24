import { categories as seedCategories, tasks as seedTasks } from './data.js';
import { selectTasks, findTask } from './task-service.js';
const noFilters = { completed: null, priority: null, categoryId: null, q: '' };

export function createStore() {
  let tasks;
  let nextId;
  const categories = seedCategories.map(item => ({ ...item }));
  function reset() {
    tasks = seedTasks.map(item => ({ ...item }));
    nextId = Math.max(0, ...tasks.map(item => item.id)) + 1;
    return { reset: true, total: tasks.length };
  }
  reset();
  return {
    listTasks: (filters = noFilters) => selectTasks(tasks, filters).map(item => ({ ...item })),
    getTask: id => { const task = findTask(tasks, id); return task ? { ...task } : null; },
    listCategories: () => categories.map(item => ({ ...item })),
    reset,
    createTask(value) {
      // value уже проверен. id — из счётчика, а не из длины массива.
      const task = { id: nextId, title: value.title, completed: false, priority: value.priority, categoryId: value.categoryId };
      nextId += 1;
      tasks = [...tasks, task];
      return { ...task };
    },
    updateTask(id, changes) {
      const current = findTask(tasks, id);
      if (!current) return null;
      // Применяются только переданные поля; id сохраняется.
      const updated = { ...current, ...changes, id: current.id };
      tasks = tasks.map(item => (item.id === id ? updated : item));
      return { ...updated };
    },
    deleteTask(id) {
      if (!findTask(tasks, id)) return false;
      tasks = tasks.filter(item => item.id !== id); // nextId не уменьшается
      return true;
    },
  };
}
