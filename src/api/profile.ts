import type { User } from "../models";

type ProfileApiUser = Partial<User> & {
  _id?: string;
  stylePreference?: string;
  sizePreference?: string;
};

/** The backend returns MongoDB _id; protect the existing session identity. */
export function mergeProfileUser(current: User, saved: ProfileApiUser): User {
  if (
    !saved ||
    (saved._id && saved._id !== current.id) ||
    (saved.id && saved.id !== current.id)
  ) {
    throw Error("Profile belongs to a different account.");
  }
  return {
    ...current,
    fullName: typeof saved.fullName === "string" && saved.fullName.trim()
      ? saved.fullName.trim()
      : current.fullName,
    phone: typeof saved.phone === "string" ? saved.phone : current.phone,
    stylePreference: typeof saved.stylePreference === "string"
      ? saved.stylePreference
      : current.stylePreference,
    sizePreference: typeof saved.sizePreference === "string"
      ? saved.sizePreference
      : current.sizePreference,
    // Account identity, role and email may not be modified in the edit form.
    id: current.id,
    role: current.role,
    email: current.email,
  };
}
