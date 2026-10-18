declare module "react-native-razorpay" {
  const Razorpay: {
    open(options: Record<string, unknown>): Promise<{
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>;
  };
  export default Razorpay;
}
