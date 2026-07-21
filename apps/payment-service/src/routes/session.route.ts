import { Hono } from "hono";
import crypto from "crypto";
import razorpay from "../utils/razorpay.js";
import { shouldBeUser } from "../middleware/authMiddleware.js";
import { CartItemsType, ShippingFormInputs } from "@repo/types";

const sessionRoute = new Hono();

sessionRoute.post("/create-order", shouldBeUser, async (c) => {
  const {
    cart,
    shipping,
  }: { cart: CartItemsType; shipping: ShippingFormInputs } = await c.req.json();
  const userId = c.get("userId");

  const amountInPaise = Math.round(
    cart.reduce((acc, item) => acc + item.price * item.quantity, 0) * 100
  );

  if (amountInPaise <= 0) {
    return c.json({ error: "Cart is empty" }, 400);
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        email: shipping.email,
        products: JSON.stringify(
          cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }))
        ),
      },
    });

    return c.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create order failed", error);

    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment order",
      },
      500
    );
  }
});

sessionRoute.post("/verify-payment", shouldBeUser, async (c) => {
  const payload = await c.req.json();
  console.log("verify-payment payload", payload);

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    shipping: ShippingFormInputs;
    cart: CartItemsType;
  } = payload;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return c.json(
      { error: "Missing Razorpay verification fields" },
      400
    );
  }

  const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(sign)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.error("Invalid Razorpay signature", {
      expectedSignature,
      razorpay_signature,
      sign,
    });
    return c.json({ error: "Invalid payment signature" }, 400);
  }

  try {
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log("payment fetched", payment);

    return c.json({
      status: "success",
      paymentStatus: payment.status,
    });
  } catch (error) {
    console.error("Failed to verify payment", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify payment",
      },
      500
    );
  }
});

sessionRoute.get("/:order_id", async (c) => {
  const { order_id } = c.req.param();

  try {
    const order = await razorpay.orders.fetch(order_id);
    const payments = await razorpay.orders.fetchPayments(order_id);
    const payment = payments.items[0];

    return c.json({
      status: order.status,
      paymentStatus: payment?.status ?? "pending",
    });
  } catch {
    return c.json({ error: "Order not found" }, 404);
  }
});

export default sessionRoute;