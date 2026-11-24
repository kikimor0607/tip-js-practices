import { useEffect, useRef, useState } from 'react';

const EMPTY_SNAPSHOT = { tasks: [], categories: [], meta: { total: 0 } };

// Основное задание ПР8. api передаётся зависимостью, поэтому хук проверяется без настоящей сети.
// Хук управляет задачами (snapshot.tasks), признаком загрузки (status) и ошибкой (error).
export function useTaskData({ api, filters }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0); // счётчик обновлений: его смена запускает новый GET

  // Служебные ссылки: не отображаются, поэтому не вызывают перерисовку.
  const mountedRef = useRef(false);
  const mutationRef = useRef(null); // AbortController текущей мутации — немедленная блокировка

  // Удобные производные значения для компонентов.
  const tasks = snapshot.tasks;
  const isLoading = status === 'loading';

  // Признак монтирования восстанавливается в setup — важно для повторного цикла StrictMode.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationRef.current?.abort(); // размонтирование отменяет и текущую мутацию
      mutationRef.current = null;
    };
  }, []);

  // Значения фильтров извлекаются заранее: зависимости — примитивы, а не объект filters.
  const { q, completed, priority, categoryId } = filters;

  useEffect(() => {
    let active = true; // актуальность именно этого запуска эффекта
    const controller = new AbortController();

    async function load() {
      setStatus('loading');
      setError(null); // прежний снимок сохраняется на время загрузки
      try {
        const next = await api.loadInitialData({ q, completed, priority, categoryId }, { signal: controller.signal });
        if (!active) return; // запоздавший успех игнорируется
        setSnapshot(next);
        setStatus('ready');
      } catch (loadError) {
        if (!active || controller.signal.aborted) return; // запоздавшая ошибка и отмена не показываются
        setError(loadError);
        setStatus('error');
      }
    }

    void load();
    return () => {
      active = false; // сначала запрещаем запись результата,
      controller.abort(); // затем отменяем ожидающий запрос
    };
  }, [api, q, completed, priority, categoryId, revision]);

  function refresh() {
    setRevision(previous => previous + 1);
  }

  // Общая схема изменения: блокировка → запрос → новый GET при успехе → разблокировка.
  async function mutate(operation) {
    if (!mountedRef.current || mutationRef.current) return false; // повторный вызов во время записи
    const controller = new AbortController();
    mutationRef.current = controller; // до первого await, иначе второй синхронный вызов пройдёт
    setPending(true);
    setMutationError(null);
    try {
      await operation(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return false;
      refresh(); // GET выполнит эффект с актуальными фильтрами
      return true;
    } catch (mutateError) {
      if (mountedRef.current && !controller.signal.aborted) setMutationError(mutateError);
      return false;
    } finally {
      // Освобождаем только свою операцию.
      if (mutationRef.current === controller) {
        mutationRef.current = null;
        if (mountedRef.current) setPending(false);
      }
    }
  }

  const saveTask = (id, value) => mutate(signal => (id === null
    ? api.createTask(value, { signal })
    : api.updateTask(id, value, { signal })));
  const toggleTask = task => mutate(signal => api.setTaskCompleted(task.id, !task.completed, { signal }));
  const deleteTask = id => mutate(signal => api.deleteTask(id, { signal }));
  const resetData = () => mutate(signal => api.resetDemoData({ signal }));

  return {
    snapshot, status, error, mutationError, pending,
    tasks, isLoading,
    refresh, saveTask, toggleTask, deleteTask, resetData,
  };
}
