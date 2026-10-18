import { useRouter, type Href } from "expo-router";
import { routeFor } from "./routes";
export function useNavigate() {
  const router = useRouter();
  return (name: string, id?: string) => {
    const path = routeFor(name, id) as Href;
    if (["Home", "Shop", "Wishlist", "Bag", "Account"].includes(name))
      router.navigate(path);
    else router.push(path);
  };
}
