import React, { useEffect, useState } from "react";
import {
  Redirect,
  usePathname,
  useGlobalSearchParams,
  type Href,
} from "expo-router";
import { loginPath } from "../navigation/authReturn";
import { readDeliveryLocation } from "../api/deliveryLocation";
import { session } from "../api/runtime";
import { actions } from "../state/store";
import { useAppDispatch, useAppSelector } from "../state";
import { ErrorBox, Loading } from "./ui";
export function Bootstrap({ children }: React.PropsWithChildren) {
  const dispatch = useAppDispatch();
  const [retry, setRetry] = useState(0);
  const { ready, error } = useAppSelector((x) => x.auth);
  useEffect(() => {
    let active = true;
    void (async () => {
      let failure: string | undefined;
      try {
        await session.restore();
      } catch {
        failure =
          "Saved sign-in could not be restored. Unlock the device and retry.";
      }
      try {
        const value = await readDeliveryLocation();
        if (active && value) dispatch(actions.setLocation(value));
      } catch {
        failure = failure || "Saved delivery settings could not be restored.";
      } finally {
        if (active) dispatch(actions.ready(failure));
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch, retry]);
  if (!ready) return <Loading />;
  return (
    <>
      {error ? (
        <ErrorBox message={error} retry={() => setRetry((x) => x + 1)} />
      ) : null}
      {children}
    </>
  );
}
export function RequireCustomer({ children }: React.PropsWithChildren) {
  const user = useAppSelector((x) => x.auth.user);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const query = new URLSearchParams();
  for (const key of ["id"])
    if (typeof params[key] === "string") query.set(key, params[key]);
  return user ? (
    <React.Fragment key={user.id}>{children}</React.Fragment>
  ) : (
    <Redirect
      href={loginPath(pathname + (query.size ? "?" + query : "")) as Href}
    />
  );
}
