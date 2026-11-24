import TaskItem from './TaskItem.jsx';

// tasks — уже отфильтрованная выборка из App.
export default function TaskList({ tasks, categories, onToggle, onEdit, onDelete }) {
  const categoryName = id => categories.find(category => category.id === id)?.name ?? 'Без категории';

  return (
    <section aria-label="Список задач">
      <h2>Задачи</h2>
      <p role="status">Найдено: {tasks.length}</p>
      {tasks.length === 0 ? (
        <p className="empty">Список задач пуст</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              categoryName={categoryName(task.categoryId)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
