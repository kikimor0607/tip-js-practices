const EMPTY_FILTERS = { q: '', completed: '', priority: '', categoryId: '' };

// Кнопки статуса: значение фильтра completed — '', 'false' или 'true'.
const STATUS_BUTTONS = [
  { value: '', label: 'Все' },
  { value: 'false', label: 'В работе' },
  { value: 'true', label: 'Завершенные' },
];

export default function TaskFilters({ filters, categories, onChange }) {
  const update = (name, value) => onChange({ ...filters, [name]: value });

  return (
    <section aria-label="Фильтры">
      <h2>Фильтры</h2>

      <div className="status-filter" role="group" aria-label="Статус">
        {STATUS_BUTTONS.map(button => {
          const active = filters.completed === button.value;
          return (
            <button
              key={button.label}
              type="button"
              className={active ? 'filter-button is-active' : 'filter-button'}
              aria-pressed={active}
              onClick={() => update('completed', button.value)}
            >
              {button.label}
            </button>
          );
        })}
      </div>

      <label htmlFor="filter-q">Поиск по названию</label>
      <input id="filter-q" type="search" value={filters.q} onChange={event => update('q', event.target.value)} />

      <label htmlFor="filter-priority">Приоритет</label>
      <select id="filter-priority" value={filters.priority} onChange={event => update('priority', event.target.value)}>
        <option value="">Любой</option>
        <option value="low">Низкий</option>
        <option value="medium">Средний</option>
        <option value="high">Высокий</option>
      </select>

      <label htmlFor="filter-category">Категория</label>
      <select id="filter-category" value={filters.categoryId} onChange={event => update('categoryId', event.target.value)}>
        <option value="">Любая</option>
        {categories.map(category => (
          <option key={category.id} value={String(category.id)}>{category.name}</option>
        ))}
      </select>

      <div className="actions">
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)}>Сбросить фильтры</button>
      </div>
    </section>
  );
}
