import type { Session, User } from "../models";
export interface SecureStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
export function createSessionManager(
  storage: SecureStorage,
  acceptsRole: (role: string) => boolean = (role) => role === "CUSTOMER",
) {
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
      typeof s.user.role === "string" &&
      acceptsRole(s.user.role)
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
        if (data?.signedOut === true) return;
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
      if (!valid(next)) throw Error("A valid account session is required.");
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
    async updateUser(update: (user: User) => User, expected = revision) {
      await enqueue(async () => {
        if (expected !== revision || !current)
          throw Error("Sign-in session changed.");
        const next = { ...current, user: update(current.user) };
        if (next.user.id !== current.user.id || !valid(next))
          throw Error("Sign-in session changed.");
        await storage.set(JSON.stringify(next));
        if (expected !== revision) throw Error("Sign-in session changed.");
        current = next;
        notify();
      });
    },
    async clear() {
      revision++;
      current = null;
      notify();
      await enqueue(async () => {
        try {
          await storage.remove();
        } catch {
          await storage.set(JSON.stringify({ signedOut: true }));
        }
      });
    },
  };
}
export type SessionManager = ReturnType<typeof createSessionManager>;
