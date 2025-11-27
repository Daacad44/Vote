const DEFAULT_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin.replace(/\/$/, "")}/api`
    : "http://localhost:4000/api";

const API_BASE =
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : DEFAULT_BASE);

type JsonBody = Record<string, unknown>;

type Options = Omit<RequestInit, "body" | "headers"> & {
  token?: string | null;
  body?: BodyInit | JsonBody | null;
  headers?: HeadersInit;
};

export async function api<T>(
  path: string,
  { token, headers, body, ...options }: Options = {},
): Promise<T> {
  const computedHeaders: HeadersInit = {
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const finalBody =
    body && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob)
      ? JSON.stringify(body)
      : body ?? undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: computedHeaders,
    body: finalBody,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("Content-Type");
  if (contentType?.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as T;
}
