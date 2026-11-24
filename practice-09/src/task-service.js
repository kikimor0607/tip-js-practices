// Все фильтры объединяются через И. Исходный массив не изменяется.
export function selectTasks(tasks, filters) {
  const q = filters.q.toLocaleLowerCase('ru-RU');
  return tasks.filter(task =>
    // null означает «нет ограничения»; false проверяется явно, а не через if (filters.completed).
    (filters.completed === null || task.completed === filters.completed)
    && (filters.priority === null || task.priority === filters.priority)
    && (filters.categoryId === null || task.categoryId === filters.categoryId)
    && (q === '' || task.title.toLocaleLowerCase('ru-RU').includes(q)));
}

// Поиск по полю id, не по индексу. Возвращает задачу или null.
export function findTask(tasks, id) {
  return tasks.find(task => task.id === id) ?? null;
}
