const rawBaseUrl = (import.meta.env.VITE_API_URL ?? "").trim();
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${cleanPath}`;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function requestJson<TResponse>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<TResponse> {
  if (!normalizedBaseUrl) {
    throw new Error("VITE_API_URL is missing");
  }

  const headers = new Headers(init?.headers);
  const hasBody = init?.body !== undefined;
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(init!.body) : undefined,
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const fallbackMessage = `Request failed (${response.status})`;
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : fallbackMessage;
    throw new Error(errorMessage);
  }

  return payload as TResponse;
}
