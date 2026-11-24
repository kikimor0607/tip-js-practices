import { useState } from 'react';
import { tasks as initialTasks, categories } from './data.js';
import { createInitialFilters } from './variant.js';
import { addTask, getTaskStats, removeTask, selectTasks, toggleTask, updateTask } from './domain/task-service.js';
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

export default function App() {
  // Владелец общего состояния: задачи, фильтры и id редактируемой задачи.
  const [tasks, setTasks] = useState(() => initialTasks.map(task => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);

  // Производные значения вычисляются на каждом рендере, отдельного состояния нет.
  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = editingId === null ? null : tasks.find(task => task.id === editingId) ?? null;

  function handleSave(value) {
    if (editingId === null) {
      // Следующий id — максимум полного массива + 1, внутри чистого обновления.
      setTasks(previous => addTask(previous, value, previous.reduce((max, task) => Math.max(max, task.id), 0) + 1));
      return true;
    }
    if (!tasks.some(task => task.id === editingId)) return false;
    const id = editingId;
    setTasks(previous => updateTask(previous, id, value));
    setEditingId(null);
    return true;
  }

  function handleToggle(id) {
    setTasks(previous => toggleTask(previous, id));
  }

  function handleDelete(id) {
    // Подтверждение — до обновления состояния, а не внутри него.
    if (!window.confirm('Удалить задачу?')) return;
    setTasks(previous => removeTask(previous, id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <main>
      <h1>Задачи на React</h1>
      <p>ПР7: данные в памяти. Обновление страницы восстанавливает исходный набор.</p>
      <TaskStats stats={stats} />
      <TaskFilters filters={filters} categories={categories} onChange={setFilters} />
      <TaskForm
        key={editingId ?? 'new'}
        categories={categories}
        initialTask={editingTask}
        onSave={handleSave}
        onCancel={() => setEditingId(null)}
      />
      <TaskList
        tasks={visibleTasks}
        categories={categories}
        onToggle={handleToggle}
        onEdit={setEditingId}
        onDelete={handleDelete}
      />
    </main>
  );
}
