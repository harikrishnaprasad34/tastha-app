/** Use the existing Tastha password-login contract without retaining a password. */
export function customerLoginPayload(identifier: string, password: string) {
  const email = identifier.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Enter your registered email address.");
  return { email, identifier: email, password };
}
