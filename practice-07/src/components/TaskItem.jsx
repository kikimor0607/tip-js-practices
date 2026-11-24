const PRIORITY_LABELS = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };

// Карточка не хранит копию задачи: всё берётся из props родителя.
export default function TaskItem({ task, categoryName, onToggle, onEdit, onDelete }) {
  return (
    <li className={task.completed ? 'task is-completed' : 'task'}>
      <h3 className="task-title">{task.title}</h3>
      <p className="task-meta">
        {task.completed ? 'Выполнена' : 'В работе'} · Приоритет: {PRIORITY_LABELS[task.priority]} · Категория: {categoryName}
      </p>
      <div className="actions">
        <button type="button" aria-pressed={task.completed} onClick={() => onToggle(task.id)}>
          {task.completed ? 'Вернуть в работу' : 'Завершить'}
        </button>
        <button type="button" onClick={() => onEdit(task.id)}>Редактировать</button>
        <button type="button" onClick={() => onDelete(task.id)}>Удалить</button>
      </div>
    </li>
  );
}
