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
      let result: Awaited<ReturnType<typeof raw>>;
      try {
        result = await raw("/auth/refresh-token", {
          method: "POST",
          auth: "none",
          // Deployed backend versions accept either "token" or "refreshToken".
          body: {
            token: old.refreshToken,
            refreshToken: old.refreshToken,
          },
        });
      } catch (error) {
        // A network error, timeout or server failure must not log the customer out.
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403) &&
          expected === session.revision()
        )
          await session.clear();
        throw error;
      }
      const { response, data } = result;
      if (response.status === 401 || response.status === 403) {
        // Only a definitive refresh-token rejection invalidates the session.
        if (expected === session.revision()) await session.clear();
        throw new ApiError("Your session expired. Please sign in again.", 401);
      }
      if (
        !response.ok ||
        data.success === false ||
        typeof data.accessToken !== "string" ||
        !data.accessToken ||
        typeof data.refreshToken !== "string" ||
        !data.refreshToken
      )
        throw new ApiError(
          "Could not reconnect your account. Check your connection and retry.",
          response.status,
        );
      await session.save(
        { ...old, accessToken: data.accessToken, refreshToken: data.refreshToken },
        expected,
      );
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
        // A different request may already have refreshed a one-time token.
        // A late 401 from the old token must not rotate (and invalidate) it again.
        if (session.get()?.accessToken === token) await rotate(epoch);
        if (options.signal?.aborted) throw new ApiError("Request cancelled.");
        if (epoch !== session.revision() || !session.get()?.accessToken)
          throw new ApiError("Your session changed.");
        result = await raw(path, options, session.get()!.accessToken);
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
