import * as Yup from "yup";
import type { User } from "../models";

export const profileStyles = [
  "Smart Casual",
  "Formal",
  "Streetwear",
  "Ethnic",
] as const;
export const profileSizes = ["S", "M", "L", "XL", "XXL"] as const;
export function profileFormValues(user: User) {
  return {
    fullName: user.fullName || "",
    phone: user.phone || "",
    stylePreference: user.stylePreference || "Smart Casual",
    sizePreference: user.sizePreference || "M",
  };
}
export const profileSchema = Yup.object({
  fullName: Yup.string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(80, "Use 80 characters or fewer")
    .required("Full name is required"),
  phone: Yup.string()
    .trim()
    .matches(/^(?:\+91[ -]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number")
    .required("Phone number is required"),
  stylePreference: Yup.string()
    .oneOf([...profileStyles], "Choose an available style")
    .required("Choose your preferred style"),
  sizePreference: Yup.string()
    .oneOf([...profileSizes], "Choose S, M, L, XL or XXL")
    .required("Choose your preferred size"),
});
