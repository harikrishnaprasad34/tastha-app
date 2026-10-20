import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { ScrollView, Text, View } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { adminApi, adminSession } from "../api/adminRuntime";
import {
  adminMetricText,
  hasAdminPermission,
  loadAdminModule,
  type AdminModule,
  type AdminSnapshot,
} from "../api/admin";
import type { Session } from "../models";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Loading,
  styles as s,
} from "../components/ui";

function StaffLogin() {
  const [challenge, setChallenge] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Staff sign in</Text>
      <Text style={s.muted}>
        Use your Tastha staff account. Your customer account stays signed in
        separately.
      </Text>
      <Formik
        key={challenge ? "otp" : "credentials"}
        initialValues={{ identifier: "", password: "", otp: "" }}
        validationSchema={
          challenge
            ? Yup.object({
                otp: Yup.string()
                  .matches(/^\d{6}$/, "Enter the six-digit WhatsApp code")
                  .required("Enter the code"),
              })
            : Yup.object({
                identifier: Yup.string()
                  .trim()
                  .required("Enter your staff email, mobile or username"),
                password: Yup.string().required("Enter your password"),
              })
        }
        onSubmit={async (values) => {
          setError("");
          const revision = adminSession.revision();
          try {
            if (challenge) {
              const result = await adminApi.request<Session>(
                "/auth/verify-admin-otp",
                {
                  auth: "none",
                  method: "POST",
                  body: { loginChallenge: challenge, otp: values.otp },
                },
              );
              await adminSession.save(result, revision, true);
            } else {
              const result = await adminApi.request<{
                requireAdminOtp?: boolean;
                loginChallenge?: string;
                message?: string;
              }>("/auth/login", {
                auth: "none",
                method: "POST",
                body: {
                  identifier: values.identifier.trim(),
                  password: values.password,
                },
              });
              if (
                result.requireAdminOtp !== true ||
                typeof result.loginChallenge !== "string" ||
                !result.loginChallenge
              )
                throw Error(
                  "A staff OTP challenge is required. Use customer sign-in for shopping accounts.",
                );
              setMessage(
                result.message ||
                  "Enter the code sent to your registered WhatsApp number.",
              );
              setChallenge(result.loginChallenge);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Staff sign-in failed.");
          }
        }}
      >
        {({
          values,
          handleChange,
          handleSubmit,
          errors,
          touched,
          isSubmitting,
        }) => (
          <View style={{ gap: 16 }}>
            {challenge ? (
              <>
                <Text style={s.muted}>{message}</Text>
                <Field
                  label="WhatsApp code"
                  value={values.otp}
                  onChangeText={handleChange("otp")}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  error={touched.otp ? errors.otp : undefined}
                />
              </>
            ) : (
              <>
                <Field
                  label="Staff email, mobile or username"
                  value={values.identifier}
                  onChangeText={handleChange("identifier")}
                  autoCapitalize="none"
                  autoComplete="username"
                  error={touched.identifier ? errors.identifier : undefined}
                />
                <Field
                  label="Password"
                  value={values.password}
                  onChangeText={handleChange("password")}
                  secureTextEntry
                  autoComplete="current-password"
                  error={touched.password ? errors.password : undefined}
                />
              </>
            )}
            <ErrorBox message={error} />
            <Button
              title={
                challenge ? "Verify staff code" : "Continue with staff account"
              }
              onPress={() => handleSubmit()}
              busy={isSubmitting}
            />
            {challenge ? (
              <Button
                title="Start sign-in again / request a fresh code"
                outline
                disabled={isSubmitting}
                onPress={() => {
                  setChallenge("");
                  setMessage("");
                  setError("");
                }}
              />
            ) : null}
          </View>
        )}
      </Formik>
    </ScrollView>
  );
}
const metricLabels: Record<string, string> = {
  totalSales: "Net paid sales",
  totalOrders: "Orders",
  pendingOrders: "Pending payments",
  pendingFulfillment: "Pending fulfillment",
  refunds: "Successful refunds",
  totalProducts: "Products",
  inventoryValue: "Retail inventory value",
  totalCustomers: "Customers",
};
function Workspace({ logout }: { logout: () => void }) {
  const [module, setModule] = useState<AdminModule>("dashboard");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  useRevalidateOnFocus(
    useCallback(() => {
      // The manual refresh generation intentionally starts a new request lifetime.
      void retry;
      const controller = new AbortController();
      setBusy(true);
      setData(null);
      setError("");
      void loadAdminModule(adminApi, module, page, search, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error ? e.message : "Staff view could not load.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
      return () => controller.abort();
    }, [module, page, search, retry]),
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Admin workspace</Text>
      <Text style={s.muted}>
        Read-only dashboard, order and catalog views. Figures and statuses come
        from the server. Dashboard selected period: last 30 days, Asia/Kolkata.
      </Text>
      <View style={s.row}>
        {(["dashboard", "orders", "products"] as AdminModule[]).map((value) => (
          <Button
            key={value}
            title={value[0].toUpperCase() + value.slice(1)}
            outline={module !== value}
            disabled={
              !!data && !hasAdminPermission(data.permissions, value + ".view")
            }
            onPress={() => {
              setModule(value);
              setPage(1);
              setSearch("");
              setDraft("");
            }}
          />
        ))}
      </View>
      {module !== "dashboard" ? (
        <>
          <Field
            label={module === "orders" ? "Search orders" : "Search catalog"}
            value={draft}
            onChangeText={setDraft}
            maxLength={200}
            returnKeyType="search"
            onSubmitEditing={() => {
              setSearch(draft);
              setPage(1);
              setRetry((n) => n + 1);
            }}
          />
          <Button
            title="Search"
            outline
            onPress={() => {
              setSearch(draft);
              setPage(1);
              setRetry((n) => n + 1);
            }}
          />
        </>
      ) : null}
      <ErrorBox message={error} retry={() => setRetry((n) => n + 1)} />
      {busy ? <Loading /> : null}
      {data?.metrics
        ? Object.entries(metricLabels).map(([key, label]) => (
            <View key={key} style={s.panel}>
              <Text style={s.muted}>{label}</Text>
              <Text style={s.heading}>
                {adminMetricText(data.metrics?.[key])}
              </Text>
              <Text style={s.small}>
                {data.metrics?.[key]?.scope || "Scope unavailable"}
              </Text>
              <Text style={s.small}>
                {data.metrics?.[key]?.basis ||
                  data.metrics?.[key]?.reason ||
                  "Metric definition unavailable"}
              </Text>
            </View>
          ))
        : null}
      {data?.generatedAt ? (
        <Text style={s.small}>Server generated: {data.generatedAt}</Text>
      ) : null}
      {data && module !== "dashboard" ? (
        <>
          <Text style={s.muted}>
            {data.total} records · Page {data.page} of {data.totalPages}
          </Text>
          {!data.records.length ? <Empty title="No matching records" /> : null}
          {data.records.map((record) => (
            <View key={record._id} style={s.panel}>
              <Text style={s.heading}>
                {module === "orders"
                  ? record.orderNumber || record._id
                  : record.name || record._id}
              </Text>
              {module === "orders" ? (
                <>
                  <Text style={s.text}>
                    Order: {record.orderStatus || "Unknown"}
                  </Text>
                  <Text style={s.muted}>
                    Payment: {record.paymentStatus || "Unknown"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.text}>
                    {record.status || "Status unavailable"}
                  </Text>
                  <Text style={s.muted}>
                    SKU: {record.sku || "Unavailable"}
                  </Text>
                </>
              )}
              <Text style={s.price}>
                {adminMetricText({
                  value:
                    (module === "orders" ? record.totalAmount : record.price) ??
                    null,
                  unit: "INR",
                  availability: "available",
                })}
              </Text>
            </View>
          ))}
          <View style={s.row}>
            <Button
              title="Previous"
              outline
              disabled={busy || data.page <= 1}
              onPress={() => setPage(data.page - 1)}
            />
            <Button
              title="Next"
              outline
              disabled={busy || data.page >= data.totalPages}
              onPress={() => setPage(data.page + 1)}
            />
          </View>
        </>
      ) : null}
      <Button
        title="Refresh staff view"
        outline
        busy={busy}
        onPress={() => setRetry((n) => n + 1)}
      />
      <Button title="Sign out of staff workspace" outline onPress={logout} />
    </ScrollView>
  );
}
export default function Admin() {
  const current = useSyncExternalStore(
    adminSession.subscribe,
    adminSession.get,
    () => null,
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void adminSession
      .restore()
      .catch(() => {
        if (active)
          setError("Saved staff sign-in could not be restored. Sign in again.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const logout = () => {
    const prior = adminSession.get();
    if (prior)
      void adminApi
        .request("/auth/logout", {
          auth: "required",
          method: "POST",
          body: { token: prior.refreshToken },
        })
        .catch(() => {});
    setError("");
    void adminSession
      .clear()
      .catch(() =>
        setError(
          "Staff secure storage could not be cleared. Keep the app open and retry sign-out.",
        ),
      );
  };
  if (!ready) return <Loading />;
  return (
    <View style={s.screen}>
      <ErrorBox message={error} retry={logout} />
      {current ? (
        <Workspace key={current.user.id} logout={logout} />
      ) : (
        <StaffLogin />
      )}
    </View>
  );
}
