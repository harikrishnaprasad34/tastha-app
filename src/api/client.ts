import type { Session } from "../models";
import type { SessionManager } from "./session";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code?: string,
  ) {
    super(message);
  }
}
type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: "none" | "optional" | "required";
  timeout?: number;
};
export function createApiClient(
  base: string,
  session: SessionManager,
  fetcher: typeof fetch = fetch,
) {
  let refresh: Promise<void> | undefined;
  async function raw(path: string, options: Options, token?: string) {
    if (!path.startsWith("/") || path.startsWith("//"))
      throw new ApiError("Invalid API path.");
    const controller = new AbortController(),
      abort = () => controller.abort();
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, options.timeout ?? 20000);
    try {
      const response = await fetcher(base + path, {
        method: options.method || "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
      });
      let data: Record<string, unknown>;
      try {
        data = await response.json();
      } catch {
        throw new ApiError(
          "The server returned an unreadable response.",
          response.status,
        );
      }
      return { response, data };
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (controller.signal.aborted)
        throw new ApiError("Request cancelled or timed out. Retry when ready.");
      throw new ApiError(
        "Cannot reach Tastha. Check your connection and retry.",
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  async function rotate(expected: number) {
    if (refresh) return refresh;
    const old = session.get();
    if (!old) throw new ApiError("Sign in to continue.", 401);
    const pending = (async () => {
      try {
        const { response, data } = await raw(
          "/auth/refresh-token",
          {
            method: "POST",
            auth: "none",
            body: { refreshToken: old.refreshToken },
          },
          undefined,
        );
        if (
          !response.ok ||
          typeof data.accessToken !== "string" ||
          typeof data.refreshToken !== "string"
        )
          throw new ApiError(
            "Your session expired. Please sign in again.",
            401,
          );
        await session.save(
          {
            ...old,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          },
          expected,
        );
      } catch (e) {
        if (expected === session.revision()) await session.clear();
        throw e;
      }
    })();
    refresh = pending;
    try {
      await pending;
    } finally {
      if (refresh === pending) refresh = undefined;
    }
  }
  return {
    async request<T>(path: string, options: Options = {}): Promise<T> {
      const epoch = session.revision(),
        auth = options.auth || "optional",
        token = auth === "none" ? undefined : session.get()?.accessToken;
      if (auth === "required" && !token)
        throw new ApiError("Sign in to continue.", 401);
      let result = await raw(path, options, token);
      if (token && epoch !== session.revision())
        throw new ApiError("Your shopping session changed. Retry.");
      if (result.response.status === 401 && token) {
        await rotate(epoch);
        if (options.signal?.aborted) throw new ApiError("Request cancelled.");
        if (epoch !== session.revision())
          throw new ApiError("Your session changed.");
        result = await raw(path, options, session.get()?.accessToken);
      }
      if (auth !== "none" && epoch !== session.revision())
        throw new ApiError("Your shopping session changed. Retry.");
      if (!result.response.ok || result.data.success === false) {
        const text = result.data.message;
        throw new ApiError(
          typeof text === "string" && text.length < 400
            ? text
            : "Tastha could not complete this request.",
          result.response.status,
          typeof result.data.code === "string" ? result.data.code : undefined,
        );
      }
      return result.data as T;
    },
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
