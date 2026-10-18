/** Use the existing Tastha password-login contract without retaining a password. */
export function customerLoginPayload(identifier: string, password: string) {
  const email = identifier.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Enter your registered email address.");
  return { email, identifier: email, password };
}

/** Match the website's customer-registration API; never submit confirmation fields. */
export function customerRegistrationPayload(input: {
  fullName: string; email: string; phone: string; password: string;
}) {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const digits = input.phone.replace(/[^\d]/g, "");
  const local = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2) : digits;
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
  return { fullName, email, phone: "+91" + local, password: input.password };
}
