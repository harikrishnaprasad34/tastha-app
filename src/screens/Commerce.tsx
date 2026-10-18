import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { api, session } from "../api/runtime";
import { saveDeliveryLocation } from "../api/deliveryLocation";
import { locationFromAddress } from "../shared/deliveryLocation";
import {
  checkoutForCurrentSession,
  hasNativePayments,
} from "../api/nativeCheckout";
import { useAppDispatch, useAppSelector } from "../state";
import {
  actions,
  fetchAddresses,
  fetchBag,
  fetchWishlist,
  fetchOrders,
  changeBag,
  changeWishlist,
} from "../state/store";
import type { Quote, PaymentMethod, Order } from "../models";
import { linePayload, money } from "../shared/catalog";
import { isValidCheckoutQuote } from "../shared/checkoutQuote";
import {
  filterCustomerOrders,
  orderCanBeCancelled,
  type OrderView,
  type OrderSort,
} from "../shared/orders";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  Field,
  styles as s,
} from "../components/ui";
import { ProductCard, type Navigate } from "./Shop";
function SignIn({ navigate }: { navigate: Navigate }) {
  return (
    <View style={s.content}>
      <Empty
        title="Sign in to continue"
        detail="Your bag, wishlist and orders are securely saved to your account."
      />
      <Button title="Sign in" onPress={() => navigate("Login")} />
    </View>
  );
}
export function Bag({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const { bag, busy, pending, errors } = useAppSelector((x) => x.commerce);
  const [coupon, setCoupon] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (user) dispatch(fetchBag());
  }, [dispatch, user]);
  if (!user) return <SignIn navigate={navigate} />;
  async function update(arg: Parameters<typeof changeBag>[0]) {
    setError("");
    try {
      await dispatch(changeBag(arg)).unwrap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bag update failed.");
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Your bag</Text>
      {pending.bag ? <Loading /> : null}
      <ErrorBox message={errors.bag} retry={() => dispatch(fetchBag())} />
      {bag?.items.map((line) => (
        <View key={line._id} style={s.panel}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("Product", line.product._id)}
          >
            <Text style={s.heading}>{line.product.name}</Text>
          </Pressable>
          <Text style={s.muted}>
            {[line.selectedColor, line.selectedSize]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={s.price}>
            {money(line.price)} × {line.quantity}
          </Text>
          {line.isOutOfStock ||
          line.inventoryUnknown ||
          line.isQuantityExceeded ? (
            <Text style={s.error}>
              This selection needs a stock check. Reduce the quantity or remove
              it.
            </Text>
          ) : null}
          <View style={s.row}>
            <Button
              title="−"
              disabled={busy}
              onPress={() =>
                update({
                  kind: "quantity",
                  itemId: line._id,
                  quantity: line.quantity - 1,
                })
              }
            />
            <Text
              accessibilityLabel={"Quantity " + line.quantity}
              style={s.text}
            >
              {line.quantity}
            </Text>
            <Button
              title="+"
              disabled={busy}
              onPress={() =>
                update({
                  kind: "quantity",
                  itemId: line._id,
                  quantity: line.quantity + 1,
                })
              }
            />
            <Button
              title="Remove"
              outline
              disabled={busy}
              onPress={() =>
                update({ kind: "quantity", itemId: line._id, quantity: 0 })
              }
            />
          </View>
        </View>
      ))}
      {bag && !bag.items.length ? <Empty title="Your bag is empty" /> : null}
      <ErrorBox message={error} />
      {bag?.items.length ? (
        <>
          {bag.appliedCoupon ? (
            <View style={s.panel}>
              <Text style={s.text}>Applied coupon: {bag.appliedCoupon}</Text>
              <Button
                title="Remove coupon"
                outline
                busy={busy}
                onPress={() => update({ kind: "removeCoupon" })}
              />
            </View>
          ) : null}
          <Field
            label="Coupon code"
            value={coupon}
            onChangeText={setCoupon}
            autoCapitalize="characters"
          />
          <Button
            title={bag.appliedCoupon ? "Change coupon" : "Apply coupon"}
            outline
            busy={busy}
            disabled={!coupon.trim()}
            onPress={() => update({ kind: "coupon", couponCode: coupon })}
          />
          <Text style={s.price}>Bag total {money(bag.totalAmount)}</Text>
          <Text style={s.muted}>
            The delivery charge and applicable tax are confirmed at checkout.
          </Text>
          <Button
            title="Continue to checkout"
            disabled={
              busy ||
              bag.items.some(
                (x) =>
                  x.isOutOfStock || x.inventoryUnknown || x.isQuantityExceeded,
              )
            }
            onPress={() => navigate("Checkout")}
          />
        </>
      ) : null}
    </ScrollView>
  );
}
export function Wishlist({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const { wishlist, pending, errors, busy } = useAppSelector((x) => x.commerce);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user) dispatch(fetchWishlist());
  }, [dispatch, user]);
  if (!user) return <SignIn navigate={navigate} />;
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Your wishlist</Text>
      {pending.wishlist ? <Loading /> : null}
      <ErrorBox
        message={errors.wishlist || error}
        retry={() => dispatch(fetchWishlist())}
      />
      {wishlist.map((product) => (
        <View key={product._id}>
          <ProductCard product={product} navigate={navigate} />
          <Button
            title="Choose variant & add to bag"
            onPress={() => navigate("Product", product._id)}
          />
          <Button
            title="Remove from wishlist"
            outline
            disabled={busy}
            onPress={() =>
              dispatch(changeWishlist({ id: product._id, remove: true }))
                .unwrap()
                .catch((e) => setError(e.message))
            }
          />
        </View>
      ))}
      {!pending.wishlist && !errors.wishlist && !wishlist.length ? (
        <Empty
          title="Save your favourites"
          detail="Add products to your wishlist from their detail pages."
        />
      ) : null}
    </ScrollView>
  );
}
export function Addresses({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const { addresses, selectedAddressId, pending, errors } = useAppSelector((x) => x.commerce);
  const delivery = useAppSelector((x) => x.location);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void dispatch(fetchAddresses());
  }, [dispatch]);

  async function choose(address: (typeof addresses)[number]) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = locationFromAddress(address);
      await saveDeliveryLocation(updated);
      dispatch(actions.selectAddress(address._id));
      dispatch(actions.setLocation(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save delivery address.");
    } finally {
      setSaving(false);
    }
  }
  async function setDefault(address: (typeof addresses)[number]) {
    if (saving || address.isDefault) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.request<{ address: { _id: string; isDefault?: boolean } }>(
        "/users/addresses/" + encodeURIComponent(address._id) + "/default",
        { auth: "required", method: "PATCH" },
      );
      if (response.address?._id !== address._id || response.address.isDefault !== true)
        throw Error("The server did not confirm this default address.");
      dispatch(actions.markDefaultAddress(address._id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Default address could not be updated.");
    } finally {
      setSaving(false);
    }
  }
  function confirmDelete(address: (typeof addresses)[number]) {
    if (saving) return;
    Alert.alert(
      "Remove saved address?",
      "The address will be removed from your Tastha account. Past orders are unchanged.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: () => {
            void (async () => {
              setSaving(true);
              setError("");
              try {
                await api.request(
                  "/users/addresses/" + encodeURIComponent(address._id),
                  { auth: "required", method: "DELETE" },
                );
                dispatch(actions.removeSavedAddress(address._id));
                if (delivery?.addressId === address._id) {
                  const manual = {
                    label: delivery.label,
                    pinCode: delivery.pinCode,
                    ...(typeof delivery.lat === "number" && typeof delivery.lng === "number"
                      ? { lat: delivery.lat, lng: delivery.lng }
                      : {}),
                  };
                  await saveDeliveryLocation(manual);
                  dispatch(actions.setLocation(manual));
                }
                await dispatch(fetchAddresses()).unwrap();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Address removed, but its selection could not be refreshed.");
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  }
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Saved addresses</Text>
      <Text style={s.muted}>Choose where to deliver, set your default address or remove old addresses.</Text>
      {pending.addresses ? <Loading /> : null}
      <ErrorBox message={errors.addresses || error} retry={() => dispatch(fetchAddresses())} />
      {addresses.map((address) => (
        <View key={address._id} style={[s.panel, address._id === selectedAddressId && s.active]}>
          <Text style={s.heading}>
            {address.fullName}{address.isDefault ? " · Default" : ""}
          </Text>
          <Text style={s.text}>
            {address.streetAddress}, {address.city}, {address.state} {address.pinCode}
          </Text>
          <Text style={s.muted}>{address.phone}</Text>
          <Button
            title={address._id === selectedAddressId ? "Selected for delivery" : "Deliver here"}
            disabled={saving || address._id === selectedAddressId}
            onPress={() => { void choose(address); }}
          />
          {!address.isDefault ? (
            <Button title="Make default" outline disabled={saving}
              onPress={() => { void setDefault(address); }} />
          ) : null}
          <Button title="Remove address" outline disabled={saving}
            onPress={() => confirmDelete(address)} />
        </View>
      ))}
      {!pending.addresses && !errors.addresses && addresses.length === 0 ? (
        <Empty title="No saved addresses" detail="Add an address to use it at checkout." />
      ) : null}
      <Button title="Add an address" onPress={() => navigate("AddressForm")} />
    </ScrollView>
  );
}
export function Orders({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const { orders, pending, errors } = useAppSelector((x) => x.commerce);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<OrderView>("ALL");
  const [sort, setSort] = useState<OrderSort>("NEWEST");
  const filtered = useMemo(
    () => filterCustomerOrders(orders, query, view, sort),
    [orders, query, view, sort],
  );
  useEffect(() => {
    if (user) dispatch(fetchOrders());
  }, [dispatch, user]);
  if (!user) return <SignIn navigate={navigate} />;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>My Orders</Text>
      <Text style={s.muted}>
        Review purchases, delivery progress and payment status.
      </Text>
      <Field
        label="Search by order number or product"
        value={query}
        onChangeText={setQuery}
        placeholder="Search your orders"
      />
      <View style={s.row}>
        {(
          [
            ["ALL", "All"],
            ["ACTIVE", "Active"],
            ["DELIVERED", "Delivered"],
            ["CANCELLED", "Cancelled"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: view === value }}
            onPress={() => setView(value)}
            style={[s.pill, view === value && s.active]}
          >
            <Text style={s.text}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        title={sort === "NEWEST" ? "Sort: Newest first" : "Sort: Oldest first"}
        outline
        onPress={() =>
          setSort((old) => (old === "NEWEST" ? "OLDEST" : "NEWEST"))
        }
      />
      <Button
        title="Refresh orders"
        outline
        onPress={() => dispatch(fetchOrders())}
      />
      {pending.orders ? <Loading /> : null}
      <ErrorBox message={errors.orders} retry={() => dispatch(fetchOrders())} />
      {filtered.map((order) => (
        <Pressable
          key={order._id || order.orderNumber}
          style={s.panel}
          accessibilityRole="button"
          accessibilityLabel={"View order " + order.orderNumber}
          onPress={() =>
            navigate("OrderDetail", order._id || order.orderNumber)
          }
        >
          <Text style={s.heading}>{order.orderNumber}</Text>
          <Text style={s.text}>Order: {order.orderStatus}</Text>
          <Text style={s.muted}>Payment: {order.paymentStatus}</Text>
          <Text style={s.price}>{money(order.totalAmount)}</Text>
          <Text style={s.muted}>
            {order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("en-IN")
              : ""}
          </Text>
          <Text style={[s.text, { color: "#D4AF37" }]}>
            View order details →
          </Text>
        </Pressable>
      ))}
      {!pending.orders && !errors.orders && !filtered.length ? (
        <Empty
          title={orders.length ? "No matching orders" : "No orders yet"}
          detail={
            orders.length
              ? "Try another search or filter."
              : "Explore Tastha collections to get started."
          }
        />
      ) : null}
    </ScrollView>
  );
}

export function OrderDetail({
  id,
  navigate,
}: {
  id: string;
  navigate: Navigate;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!id || !user) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .request<{ order: Order }>("/orders/" + encodeURIComponent(id), {
        auth: "required",
        signal: controller.signal,
      })
      .then((response) => {
        if (!response.order?._id) throw Error("Order details are unavailable.");
        if (!controller.signal.aborted) setOrder(response.order);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "Could not load order.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, user, revision]);

  if (!user) return <SignIn navigate={navigate} />;
  const cancel = () => {
    if (!order || busy) return;
    Alert.alert(
      "Cancel this order?",
      "Cancelling is final. The server will verify whether cancellation is allowed.",
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Cancel order",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError("");
            try {
              const result = await api.request<{ order: Order }>(
                "/orders/" + encodeURIComponent(id) + "/cancel",
                {
                  auth: "required",
                  method: "PUT",
                  body: { reason: "Cancelled by customer" },
                },
              );
              if (!result.order || result.order.orderStatus !== "CANCELLED")
                throw Error(
                  "Cancellation was not confirmed. Refresh the order.",
                );
              setOrder(result.order);
              dispatch(fetchOrders());
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Could not cancel order.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Order details</Text>
      <Button title="All orders" outline onPress={() => navigate("Orders")} />
      {loading ? <Loading /> : null}
      <ErrorBox message={error} retry={() => setRevision((old) => old + 1)} />
      {order ? (
        <>
          <View style={s.panel}>
            <Text style={s.heading}>{order.orderNumber}</Text>
            <Text style={s.text}>Status: {order.orderStatus}</Text>
            <Text style={s.muted}>Payment: {order.paymentStatus}</Text>
            {order.paymentMethod ? (
              <Text style={s.muted}>Method: {order.paymentMethod}</Text>
            ) : null}
            <Text style={s.price}>{money(order.totalAmount)}</Text>
            <Text style={s.muted}>
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString("en-IN")
                : ""}
            </Text>
          </View>
          {order.shippingAddress ? (
            <View style={s.panel}>
              <Text style={s.heading}>Delivery address</Text>
              <Text style={s.text}>{order.shippingAddress.fullName}</Text>
              <Text style={s.muted}>
                {order.shippingAddress.streetAddress},{" "}
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.pinCode}
              </Text>
            </View>
          ) : null}
          <Text style={s.heading}>Ordered items</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={s.panel}>
              <Text style={s.text}>
                {item.name || item.product?.name || "Product"}
              </Text>
              <Text style={s.muted}>Quantity: {item.quantity}</Text>
              <Text style={s.muted}>
                {[item.selectedColor, item.selectedSize]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {typeof item.price === "number" ? (
                <Text style={s.price}>{money(item.price)}</Text>
              ) : null}
            </View>
          ))}
          <Button
            title="Track order"
            outline
            onPress={() => navigate("TrackOrder", order._id || order.orderNumber)}
          />
          {orderCanBeCancelled(order) ? (
            <Button
              title="Request cancellation"
              busy={busy}
              outline
              onPress={cancel}
            />
          ) : null}
          <Text style={s.muted}>
            Updates are supplied by Tastha’s order service. Delivery times
            cannot be guaranteed from this screen.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

export function Checkout({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const { bag, addresses, selectedAddressId } = useAppSelector(
    (x) => x.commerce,
  );
  const address = addresses.find((a) => a._id === selectedAddressId);
  const [quote, setQuote] = useState<Quote | null>(null),
    [quoteFor, setQuoteFor] = useState(""),
    [methods, setMethods] = useState<PaymentMethod[]>([]),
    [optionsReady, setOptionsReady] = useState(false),
    [method, setMethod] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [paying, setPaying] = useState(false),
    [refresh, setRefresh] = useState(0);
  const coordinator = useMemo(
    () => (user?.id ? checkoutForCurrentSession() : null),
    [user?.id],
  );
  const fingerprint = JSON.stringify([user?.id, bag, address]);
  useEffect(() => {
    dispatch(fetchBag());
    dispatch(fetchAddresses());
  }, [dispatch]);
  useEffect(() => {
    // Keep the last bill and selection visible during gateway refresh.
    // quoteFor binds the amount to the current account, bag and address.
    setError("");
    setOptionsReady(false);
    if (!user || !bag?.items.length || !address) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      api.request<{ quote: Quote }>("/payment/quote", {
        method: "POST",
        auth: "required",
        body: {
          checkoutMode: "CART",
          itemsPayload: linePayload(bag.items),
          shippingAddress: address,
          couponCode: bag.appliedCoupon || undefined,
        },
        signal: controller.signal,
      }),
      api.request<{ paymentMethods: PaymentMethod[] }>("/payment/methods", {
        signal: controller.signal,
      }),
    ])
      .then(([q, m]) => {
        if (controller.signal.aborted) return;
        if (!isValidCheckoutQuote(q.quote) || !Array.isArray(m.paymentMethods))
          throw Error("Payment options or totals could not be verified.");
        setQuoteFor(fingerprint);
        setQuote(q.quote);
        setMethods(m.paymentMethods);
        setMethod((current) =>
          m.paymentMethods.some(
            (option) => option.code === current && option.enabled,
          )
            ? current
            : "",
        );
        setOptionsReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [fingerprint, refresh, bag, address, user]);
  const verifiedQuote = quoteFor === fingerprint ? quote : null;
  if (!user) return <SignIn navigate={navigate} />;
  async function pay() {
    if (
      !coordinator ||
      !bag ||
      !address ||
      !verifiedQuote ||
      !optionsReady ||
      !user ||
      paying ||
      loading
    )
      return;
    const chosen = methods.find((x) => x.code === method);
    if (!chosen?.enabled || (method !== "COD" && !hasNativePayments())) return;
    setPaying(true);
    setError("");
    const revision = session.revision();
    try {
      const order = await coordinator.pay({
        accountId: user.id,
        cart: bag,
        address,
        quote: verifiedQuote,
        coupon: bag.appliedCoupon || "",
        method,
        sessionIsCurrent: () => session.revision() === revision,
      });
      dispatch(fetchBag());
      dispatch(fetchOrders());
      Alert.alert("Order confirmed", order.orderNumber, [
        { text: "View orders", onPress: () => navigate("Orders") },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Payment was interrupted. Check your orders before retrying.",
      );
    } finally {
      setPaying(false);
    }
  }
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Checkout</Text>
        <Text style={s.heading}>Delivery address</Text>
        {address ? (
          <View style={s.panel}>
            <Text style={s.text}>{address.fullName}</Text>
            <Text style={s.muted}>
              {address.streetAddress}, {address.city}, {address.state}{" "}
              {address.pinCode}
            </Text>
          </View>
        ) : (
          <Empty title="Choose a delivery address" />
        )}
        <Button
          title="Choose / add address"
          outline
          disabled={paying}
          onPress={() => navigate("Addresses")}
        />
        {bag?.items.map((l) => (
          <Text key={l._id} style={s.text}>
            {l.product.name} · {l.selectedSize} · {l.selectedColor} ×{" "}
            {l.quantity}
          </Text>
        ))}
        {loading ? <Loading /> : null}
        <ErrorBox message={error} />
        <Button
          title="Refresh payment options"
          outline
          disabled={paying || loading}
          onPress={() => setRefresh((x) => x + 1)}
        />
        {verifiedQuote ? (
          <View style={s.panel}>
            {[
              ["Products", verifiedQuote.subtotal],
              ["Discount", -verifiedQuote.discount],
              ["Delivery", verifiedQuote.shippingFee],
              ["Tax", verifiedQuote.tax],
              ["Total", verifiedQuote.totalAmount],
            ].map(([label, value]) => (
              <View
                key={label}
                style={[s.row, { justifyContent: "space-between" }]}
              >
                <Text style={s.text}>{label}</Text>
                <Text style={s.text}>{money(Number(value))}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {["UPI", "CARD", "NET_BANKING", "COD"].map((code) => {
          const option = methods.find((m) => m.code === code);
          if (!option) return null;
          const available =
            optionsReady &&
            option.enabled &&
            (code === "COD" || hasNativePayments());
          return (
            <Pressable
              key={code}
              disabled={!available || paying}
              accessibilityRole="radio"
              accessibilityState={{
                checked: method === code,
                disabled: !available || paying,
              }}
              onPress={() => setMethod(code)}
              style={[
                s.panel,
                method === code && s.active,
                !available && s.disabled,
              ]}
            >
              <Text style={s.text}>{option.name || code}</Text>
              {!available ? (
                <Text style={s.muted}>
                  {!optionsReady
                    ? "Refresh payment options to confirm availability."
                    : option.enabled
                      ? "Online payment requires the installed native build."
                      : option.message || "Currently unavailable"}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        <Text style={s.muted}>
          Online orders are confirmed only after server verification. If
          interrupted, check your orders before retrying.
        </Text>
      </ScrollView>
      <View style={[s.panel, { borderRadius: 0 }]}>
        <Text style={s.price}>
          {verifiedQuote
            ? money(verifiedQuote.totalAmount)
            : "Awaiting verified total"}
        </Text>
        <Button
          title={method === "COD" ? "Place COD order" : "Pay securely"}
          busy={paying}
          disabled={
            !verifiedQuote ||
            !optionsReady ||
            loading ||
            !method ||
            !address ||
            !methods.some((x) => x.code === method && x.enabled) ||
            (method !== "COD" && !hasNativePayments())
          }
          onPress={pay}
        />
      </View>
    </View>
  );
}
export function AIAvailability() {
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{
        capability: { available: boolean; message?: string; reason?: string };
      }>("/ai-stylist/preview-capability", { signal: controller.signal })
      .then((r) =>
        setMessage(
          r.capability?.available
            ? "The backend reports generation capability. Native photo upload and try-on are not yet integrated."
            : r.capability?.message ||
                r.capability?.reason ||
                "Virtual try-on is currently unavailable.",
        ),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Virtual try-on</Text>
      <Text style={s.muted}>
        Real garment inference is required for a try-on preview. This build does
        not upload personal photos or generate simulated outfits.
      </Text>
      <ErrorBox message={error} />
      {message ? (
        <Text style={s.text}>{message}</Text>
      ) : !error ? (
        <Loading />
      ) : null}
    </ScrollView>
  );
}
