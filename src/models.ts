export interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  stylePreference?: string;
  sizePreference?: string;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export interface Variant {
  size: string;
  color: string;
  sku?: string;
  price?: number;
  stock?: number;
  images?: unknown[];
  image?: unknown;
  isActive?: boolean;
}
export interface Product {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  stock?: number;
  images?: unknown[];
  image?: unknown;
  variants?: Variant[];
  isDeleted?: boolean;
  status?: string;
}
export interface CartLine {
  _id: string;
  product: Product;
  quantity: number;
  price: number;
  selectedSize?: string;
  selectedColor?: string;
  variantSku?: string;
  isOutOfStock?: boolean;
  inventoryUnknown?: boolean;
  isQuantityExceeded?: boolean;
}
export interface Cart {
  _id: string;
  items: CartLine[];
  totalAmount: number;
  appliedCoupon?: string;
  discountAmount?: number;
}
export interface Address {
  _id: string;
  fullName: string;
  phone: string;
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  pinCode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}
export type AddressInput = Omit<Address, "_id">;
export interface DeliveryLocation {
  label: string;
  pinCode?: string;
  addressId?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
}
export interface Quote {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  currency: "INR";
}
export interface PaymentMethod {
  code: "UPI" | "CARD" | "NET_BANKING" | "COD" | "WALLET";
  name: string;
  enabled: boolean;
  message?: string;
}
export interface Order {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod?: string;
  shippingAddress?: Address;
  items?: {
    name?: string;
    product?: { _id?: string; name?: string } | null;
    price?: number;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
  }[];
}
export interface Discovery {
  success: boolean;
  banners?: {
    title?: string;
    subtitle?: string;
    image?: string;
    imageUrl?: string;
    mobileImageUrl?: string;
    link?: string;
    description?: string;
    ctaLink?: string;
  }[];
  occasions?: {
    _id?: string;
    name?: string;
    title?: string;
    slug?: string;
    image?: unknown;
  }[];
  sections?: { id?: string; title: string; products: Product[] }[];
  categories?: {
    name: string;
    slug?: string;
    image?: unknown;
    productCount?: number;
  }[];
  delivery?: { serviceable?: boolean; message?: string };
}
export interface Page {
  success: boolean;
  products: Product[];
  pagination: {
    page: number;
    total: number;
    hasNextPage?: boolean;
    totalPages?: number;
    limit?: number;
  };
  delivery?: { serviceable?: boolean; message?: string };
}
export interface CatalogFilter {
  search: string;
  category: string;
  sort: string;
  maxPrice: string;
}
