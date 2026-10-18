import { buildStore, saveAddress } from "../src/state/store";
import type { ApiClient } from "../src/api/client";
import { it, expect, vi } from "vitest";
import { createSessionManager } from "../src/api/session";
import { createApiClient } from "../src/api/client";
import { mergeProfileUser } from "../src/api/profile";
const user = { id: "alice", fullName: "Alice", role: "CUSTOMER" };
const auth = {
  user,
  accessToken: "expired-access",
  refreshToken: "one-time-old-refresh",
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
it("profile user updates preserve rotated tokens after a refresh", async () => {
  let raw: string | null = null,
    refreshes = 0;
  const session = createSessionManager({
    get: async () => raw,
    set: async (value) => {
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  });
  await session.save(auth);
  const api = createApiClient(
    "https://fixture.test",
    session,
    vi.fn(async (url, options) => {
      if (String(url).endsWith("/auth/refresh-token")) {
        refreshes++;
        return refreshes === 1
          ? response({
              accessToken: "fresh-access",
              refreshToken: "fresh-refresh",
            })
          : response({ message: "Refresh token rejected" }, 401);
      }
      if (
        (options?.headers as Record<string, string>).Authorization !==
        "Bearer fresh-access"
      )
        return response({}, 401);
      return response({ user: { _id: "alice", fullName: "Alice Updated" } });
    }),
  );
  const revision = session.revision();
  const result = await api.request<{ user: { _id: string; fullName: string } }>(
    "/users/profile",
    { method: "PUT", auth: "required", body: { fullName: "Alice Updated" } },
  );
  expect(session.get()?.refreshToken).toBe("fresh-refresh");
  await session.updateUser(
    (user) => mergeProfileUser(user, result.user),
    revision,
  );
  expect(session.get()?.refreshToken).toBe("fresh-refresh");
  await expect(
    api.request("/cart", { auth: "required" }),
  ).resolves.toBeTruthy();
  expect(session.get()?.user.fullName).toBe("Alice Updated");
  expect(refreshes).toBe(1);
});
it("failed secure-storage deletion uses a durable signed-out marker", async () => {
  let raw: string | null = null;
  const storage = {
    get: async () => raw,
    set: async (value: string) => {
      raw = value;
    },
    remove: async () => {
      throw Error("Keystore unavailable");
    },
  };
  const session = createSessionManager(storage);
  await session.save(auth);
  await expect(session.clear()).resolves.toBeUndefined();
  expect(session.get()).toBeNull();
  const reopened = createSessionManager(storage);
  await reopened.restore();
  expect(reopened.get()).toBeNull();
});

it("address retry retains the server-created address ID", async () => {
  const session = createSessionManager({
    get: async () => null,
    set: async () => {},
    remove: async () => {},
  });
  const values = {
    fullName: "Alice",
    phone: "9999999999",
    streetAddress: "Road 1",
    city: "Hyderabad",
    state: "Telangana",
    pinCode: "500034",
  };
  let calls = 0;
  const request = vi.fn(
    async (_path: string, _options: { method?: string }) => ({
      address: {
        ...values,
        _id: _options.method === "PUT" ? "address-1" : "address-" + ++calls,
      },
    }),
  );
  const store = buildStore({
    session,
    api: { request } as unknown as ApiClient,
  });
  const saveLocalLocation = vi
    .fn()
    .mockRejectedValue(Error("Secure storage unavailable"));
  let createdId: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const saved = await store
      .dispatch(
        saveAddress({ ...values, ...(createdId ? { _id: createdId } : {}) }),
      )
      .unwrap();
    createdId = saved._id;
    await expect(saveLocalLocation()).rejects.toThrow();
  }
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.map((call) => call[1]?.method)).toEqual([
    "POST",
    "PUT",
  ]);
  expect(store.getState().commerce.addresses).toHaveLength(1);
});
it("profile updates cannot cross an account change", async () => {
  const session = createSessionManager({
    get: async () => null,
    set: async () => {},
    remove: async () => {},
  });
  await session.save(auth);
  const previousRevision = session.revision();
  await session.save(
    { ...auth, user: { ...user, id: "bob" } },
    previousRevision,
    true,
  );
  await expect(
    session.updateUser(
      (current) => ({ ...current, fullName: "Alice old response" }),
      previousRevision,
    ),
  ).rejects.toThrow("session changed");
  expect(session.get()?.user.id).toBe("bob");
});
it("sign-out reports failure when neither deletion nor a durable marker can be written", async () => {
  let failed = false;
  const session = createSessionManager({
    get: async () => null,
    set: async () => {
      if (failed) throw Error("No writes");
    },
    remove: async () => {
      throw Error("No delete");
    },
  });
  await session.save(auth);
  failed = true;
  await expect(session.clear()).rejects.toThrow("No writes");
  expect(session.get()).toBeNull();
});
