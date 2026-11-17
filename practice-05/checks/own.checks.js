// Собственные проверки ПР5 (раздел 7.5 и вариант 4).
// API запускается на свободном временном порту, отдельный npm start не нужен.
import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

async function expectApiError(action, kind) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApiError, "Ожидался экземпляр ApiError");
  assert.equal(caught.kind, kind);
  return caught;
}

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
const client = createApiClient({ baseUrl, timeoutMs: 1000 });
const api = createTaskApi(client);

try {
  await check("С1. Своя комбинация: completed=true, categoryId=2, q='исправ'", async () => {
    const url = new URL(buildUrl(baseUrl, "/tasks", { completed: true, categoryId: 2, q: "исправ" }));
    assert.equal(url.searchParams.get("completed"), "true");
    assert.equal(url.searchParams.get("q"), "исправ");
    const result = await api.getTasks({ completed: true, categoryId: 2, q: "  исправ  " });
    assert.deepEqual(result.tasks.map((task) => task.id), [25]);
    assert.deepEqual(result.meta.filters, { completed: true, priority: null, categoryId: 2, q: "исправ" });
  });

  await check("С2. Отсутствующая категория 99 → http 404 CATEGORY_NOT_FOUND", async () => {
    const error = await expectApiError(() => client.requestJson("/categories/99"), "http");
    assert.equal(error.status, 404);
    assert.equal(error.code, "CATEGORY_NOT_FOUND");
  });

  await check("С3. Граница тайм-аута: 100 мс при лимите 300 — успех, 300 мс при лимите 100 — timeout", async () => {
    const ok = await client.requestJson("/debug/delay", { query: { ms: 100 }, timeoutMs: 300 });
    assert.deepEqual(ok, { data: { delayedMs: 100 } });
    await expectApiError(
      () => client.requestJson("/debug/delay", { query: { ms: 300 }, timeoutMs: 100 }),
      "timeout",
    );
  });

  await check("С4. Сигнал, отменённый до запроса, даёт aborted без обращения к сети", async () => {
    let calls = 0;
    const offline = createApiClient({
      baseUrl,
      fetchFn: (_url, { signal }) => {
        calls += 1;
        return signal.aborted ? Promise.reject(signal.reason) : Promise.resolve(new Response(null, { status: 204 }));
      },
    });
    const error = await expectApiError(
      () => offline.requestJson("/tasks", { signal: AbortSignal.abort() }),
      "aborted",
    );
    assert.equal(error.status, null);
    assert.equal(calls, 1);
  });

  await check("С5. Вариант 4: { priority: 'medium' } → [1, 10, 19, 28], meta.total = 4", async () => {
    assert.deepEqual(variantFilters, { priority: "medium" });
    const result = await api.getTasks(variantFilters);
    assert.deepEqual(result.tasks.map((task) => task.id), [1, 10, 19, 28]);
    assert.equal(result.meta.total, 4);
    assert.ok(result.tasks.every((task) => task.priority === "medium"));
  });

  await check("С6. Вариант 4 + completed=false сужает выборку до [19, 28]", async () => {
    const result = await api.getTasks({ ...variantFilters, completed: false });
    assert.deepEqual(result.tasks.map((task) => task.id), [19, 28]);
    assert.equal(result.meta.total, 2);
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
