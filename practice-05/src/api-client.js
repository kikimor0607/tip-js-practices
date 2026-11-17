export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

// Проверяет baseUrl по контракту и возвращает объект URL.
function parseBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть непустой строкой");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new TypeError(`baseUrl должен быть абсолютным адресом: ${baseUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(`baseUrl должен использовать http или https: ${baseUrl}`);
  }
  if (baseUrl.includes("?") || baseUrl.includes("#")) {
    throw new TypeError(`baseUrl не должен содержать query или hash: ${baseUrl}`);
  }
  return url;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

// Создаёт URL относительно baseUrl и добавляет непустые параметры query.
// Значения кодируются средствами URL и URLSearchParams, а не вручную.
export function buildUrl(baseUrl, path, query = {}) {
  const base = parseBaseUrl(baseUrl);
  if (typeof path !== "string" || path.replace(/^\/+|\/+$/g, "") === "") {
    throw new TypeError("path должен быть непустым относительным путём");
  }
  if (!isPlainObject(query)) {
    throw new TypeError("query должен быть обычным объектом");
  }

  // Убираем краевые слеши, чтобы между частями был ровно один разделитель.
  const basePath = base.pathname.replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  const url = new URL(`${basePath}/${relativePath}`, base.origin);

  // query не изменяется: только читаем его пары.
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(name, String(value));
  }
  return url.toString();
}

// Читает тело HTTP-ошибки, если сервер прислал JSON по контракту { error }.
async function readErrorPayload(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && payload.error && typeof payload.error === "object") {
      return payload.error;
    }
  } catch {
    // Тело ошибки повреждено — достаточно статуса; вид ошибки остаётся http.
  }
  return null;
}

// fetchFn передаётся явно, чтобы модуль можно было проверить без реальной сети.
// Возвращаемый объект: { requestJson(path, { query, signal, timeoutMs } = {}) }.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  parseBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией");
  }
  if (!isPositiveSafeInteger(timeoutMs)) {
    throw new TypeError("timeoutMs должен быть положительным целым числом");
  }

  async function requestJson(path, { query = {}, signal, timeoutMs: requestTimeout = timeoutMs } = {}) {
    if (!isPositiveSafeInteger(requestTimeout)) {
      throw new TypeError("timeoutMs должен быть положительным целым числом");
    }
    const url = buildUrl(baseUrl, path, query);

    // Тайм-аут и внешняя отмена объединяются в один сигнал для fetch.
    const timeoutSignal = AbortSignal.timeout(requestTimeout);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    // Отдельный try только для получения Response: ошибки обработки ответа
    // ниже не должны превращаться в network.
    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: combinedSignal,
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new ApiError("Запрос отменён вызывающим кодом.", { kind: "aborted", url, cause: error });
      }
      if (timeoutSignal.aborted) {
        throw new ApiError(`Превышено время ожидания ответа (${requestTimeout} мс).`, {
          kind: "timeout",
          url,
          cause: error,
        });
      }
      throw new ApiError("Не удалось получить ответ сервера (сетевая ошибка).", {
        kind: "network",
        url,
        cause: error,
      });
    }

    if (!(response instanceof Response)) {
      throw new ApiError("fetchFn вернул значение, не являющееся Response.", {
        kind: "invalid-response",
        url,
      });
    }

    // Сначала HTTP-ошибка: статус важнее формата тела.
    if (!response.ok) {
      const errorPayload = await readErrorPayload(response);
      const message = typeof errorPayload?.message === "string" && errorPayload.message !== ""
        ? errorPayload.message
        : `HTTP ${response.status}: запрос завершился ошибкой.`;
      throw new ApiError(message, {
        kind: "http",
        status: response.status,
        code: typeof errorPayload?.code === "string" ? errorPayload.code : null,
        details: errorPayload?.details ?? null,
        url,
      });
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ApiError(`Ожидался JSON, получен Content-Type «${contentType || "не указан"}».`, {
        kind: "invalid-response",
        url,
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError("Сервер вернул повреждённый JSON.", {
        kind: "invalid-response",
        url,
        cause: error,
      });
    }
  }

  return { requestJson };
}
