import { api, session } from "./runtime";
import { API_URL } from "../config";
import * as Crypto from "expo-crypto";
export async function shareInvoice(orderId: string) {
  const revision = session.revision();
  // This preflight enforces ownership and refreshes an expired access token.
  await api.request("/invoices/order/" + encodeURIComponent(orderId), {
    auth: "required",
  });
  const current = session.get();
  if (!current || revision !== session.revision())
    throw Error("Your account changed. Reopen the order.");
  const [{ File, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);
  if (!(await Sharing.isAvailableAsync()))
    throw Error("PDF sharing is unavailable on this device.");
  const file = new File(
    Paths.cache,
    "tastha-invoice-" + Crypto.randomUUID() + ".pdf",
  );
  try {
    if (revision !== session.revision())
      throw Error("Your account changed. Reopen the order.");
    await File.downloadFileAsync(
      API_URL + "/invoices/order/" + encodeURIComponent(orderId) + "/pdf",
      file,
      { headers: { Authorization: "Bearer " + current.accessToken } },
    );
    if (revision !== session.revision())
      throw Error("Your account changed. Reopen the order.");
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Tastha invoice",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      /* OS cache cleanup remains available. */
    }
  }
}
