import { useState } from 'react';
import { validateTaskDraft } from '../domain/task-service.js';

function createDraft(initialTask, categories) {
  if (initialTask) {
    return { title: initialTask.title, priority: initialTask.priority, categoryId: String(initialTask.categoryId) };
  }
  return { title: '', priority: 'medium', categoryId: categories.length > 0 ? String(categories[0].id) : '' };
}

// Форма пересоздаётся через key в App при смене редактируемой задачи.
export default function TaskForm({ categories, initialTask = null, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => createDraft(initialTask, categories));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const editing = initialTask !== null;

  const change = name => event => setDraft(previous => ({ ...previous, [name]: event.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    const result = validateTaskDraft(draft, categories);
    setErrors(result.errors);
    setMessage('');
    setSaveError('');
    if (!result.valid) return; // черновик сохраняется

    if (onSave(result.value)) {
      setMessage(editing ? 'Изменения сохранены.' : 'Задача создана.');
      if (!editing) setDraft(createDraft(null, categories));
    } else {
      setSaveError('Не удалось сохранить: задача уже отсутствует.');
    }
  }

  return (
    <section aria-label="Форма задачи">
      <h2>{editing ? `Редактирование задачи № ${initialTask.id}` : 'Новая задача'}</h2>
      <form noValidate onSubmit={handleSubmit}>
        <label htmlFor="task-title">Название</label>
        <input
          id="task-title"
          value={draft.title}
          onChange={change('title')}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
        />
        {errors.title && <p id="task-title-error" className="error">{errors.title}</p>}

        <label htmlFor="task-priority">Приоритет</label>
        <select
          id="task-priority"
          value={draft.priority}
          onChange={change('priority')}
          aria-invalid={errors.priority ? true : undefined}
          aria-describedby={errors.priority ? 'task-priority-error' : undefined}
        >
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>
        {errors.priority && <p id="task-priority-error" className="error">{errors.priority}</p>}

        <label htmlFor="task-category">Категория</label>
        <select
          id="task-category"
          value={draft.categoryId}
          onChange={change('categoryId')}
          aria-invalid={errors.categoryId ? true : undefined}
          aria-describedby={errors.categoryId ? 'task-category-error' : undefined}
        >
          {categories.map(category => (
            <option key={category.id} value={String(category.id)}>{category.name}</option>
          ))}
        </select>
        {errors.categoryId && <p id="task-category-error" className="error">{errors.categoryId}</p>}

        <div className="actions">
          <button type="submit">{editing ? 'Сохранить изменения' : 'Добавить задачу'}</button>
          {editing && <button type="button" onClick={onCancel}>Отменить</button>}
        </div>
      </form>
      <p role="status">{message}</p>
      <p role="alert">{saveError}</p>
    </section>
  );
}
