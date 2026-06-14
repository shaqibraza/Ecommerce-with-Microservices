import { Hono } from "hono";
import crypto from "crypto";
import razorpay from "../utils/razorpay.js";
import { shouldBeUser } from "../middleware/authMiddleware.js";
import { CartItemsType, ShippingFormInputs } from "@repo/types";
import { producer } from "../utils/kafka.js";

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
    console.log(error);
    return c.json({ error: "Failed to create payment order" }, 500);
  }
});

sessionRoute.post("/verify-payment", shouldBeUser, async (c) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shipping,
    cart,
  }: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    shipping: ShippingFormInputs;
    cart: CartItemsType;
  } = await c.req.json();
  const userId = c.get("userId");

  const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(sign)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return c.json({ error: "Invalid payment signature" }, 400);
  }

  try {
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    producer.send("payment.successful", {
      value: {
        userId,
        email: shipping.email,
        amount: payment.amount,
        status: payment.status === "captured" ? "success" : "failed",
        products: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: Math.round(item.price * 100),
        })),
      },
    });

    return c.json({
      status: "success",
      paymentStatus: payment.status,
    });
  } catch (error) {
    console.log(error);
    return c.json({ error: "Failed to verify payment" }, 500);
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
  } catch (error) {
    console.log(error);
    return c.json({ error: "Order not found" }, 404);
  }
});

export default sessionRoute;
