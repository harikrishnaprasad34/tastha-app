/** Use the existing Tastha password-login contract without retaining a password. */
export function customerLoginPayload(identifier: string, password: string) {
  const value = identifier.trim().toLowerCase();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!email && !/^[a-z][a-z0-9_]{2,29}$/.test(value))
    throw Error("Enter your registered email address or username.");
  return { ...(email ? { email: value } : {}), identifier: value, password };
}

/** Match the website's customer-registration API; never submit confirmation fields. */
export function customerRegistrationPayload(input: {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(username))
    throw Error(
      "Use 3–30 letters, numbers or underscores, starting with a letter.",
    );
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const digits = input.phone.replace(/[^\d]/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (fullName.length < 2 || fullName.length > 50)
    throw Error("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Enter a valid email address.");
  if (!/^[6-9]\d{9}$/.test(local))
    throw Error("Enter a valid Indian mobile number.");
  if (
    input.password.length < 8 ||
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password) ||
    !/[^A-Za-z0-9]/.test(input.password)
  )
    throw Error("Choose a stronger password.");
  return {
    username,
    fullName,
    email,
    phone: "+91" + local,
    password: input.password,
  };
}
