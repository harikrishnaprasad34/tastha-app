import type { Session } from "../models";
export interface SecureStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
export function createSessionManager(storage: SecureStorage) {
  let current: Session | null = null,
    revision = 0,
    writes: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  const enqueue = (work: () => Promise<void>) => {
    const task = writes.catch(() => {}).then(work);
    writes = task;
    return task;
  };
  const valid = (data: unknown): data is Session => {
    if (!data || typeof data !== "object") return false;
    const s = data as Session;
    return (
      typeof s.accessToken === "string" &&
      s.accessToken.length > 0 &&
      typeof s.refreshToken === "string" &&
      s.refreshToken.length > 0 &&
      typeof s.user?.id === "string" &&
      s.user.role === "CUSTOMER"
    );
  };
  return {
    get: () => current,
    revision: () => revision,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    async restore() {
      const start = revision;
      try {
        const raw = await storage.get();
        if (start !== revision) return;
        const data = raw ? JSON.parse(raw) : null;
        if (valid(data)) {
          current = data;
          notify();
        } else if (raw) {
          await enqueue(() => storage.remove());
        }
      } catch {
        if (start === revision) {
          current = null;
          notify();
        }
        throw Error("Secure sign-in storage is unavailable.");
      }
    },
    async save(next: Session, expected = revision, newLogin = false) {
      if (!valid(next)) throw Error("A valid customer session is required.");
      if (expected !== revision) throw Error("Sign-in session changed.");
      if (newLogin) {
        revision++;
        current = null;
        notify();
      }
      const claim = revision;
      await enqueue(async () => {
        if (claim !== revision) throw Error("Sign-in session changed.");
        await storage.set(JSON.stringify(next));
        if (claim !== revision) return;
        current = next;
        notify();
      });
      if (claim !== revision) throw Error("Sign-in session changed.");
    },
    async clear() {
      revision++;
      current = null;
      notify();
      await enqueue(() => storage.remove());
    },
  };
}
export type SessionManager = ReturnType<typeof createSessionManager>;
