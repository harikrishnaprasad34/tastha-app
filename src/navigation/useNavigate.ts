import {
  useRouter,
  usePathname,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { routeFor } from "./routes";
import { loginPath, safeReturnTo } from "./authReturn";
export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  return (name: string, id?: string) => {
    if (name === "Authenticated") {
      // Dismiss the whole auth stack, including login -> signup/OTP transitions.
      router.dismissAll();
      router.replace(safeReturnTo(params.returnTo) as Href);
      return;
    }
    if (name === "Login") {
      router.push(loginPath(id || params.returnTo || pathname) as Href);
      return;
    }
    let path = routeFor(name, id);
    if (["Signup", "Otp", "Recovery"].includes(name))
      path += "?returnTo=" + encodeURIComponent(safeReturnTo(params.returnTo));
    if (["Home", "Shop", "Wishlist", "Bag", "Account"].includes(name))
      router.navigate(path as Href);
    else router.push(path as Href);
  };
}
