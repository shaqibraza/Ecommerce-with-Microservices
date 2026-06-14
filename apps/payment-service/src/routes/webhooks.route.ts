import { Hono } from "hono";
import crypto from "crypto";
import razorpay from "../utils/razorpay.js";
import { producer } from "../utils/kafka.js";

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
const webhookRoute = new Hono();

webhookRoute.get("/", (c) => {
  return c.json({
    status: "ok webhook",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

webhookRoute.post("/razorpay", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("x-razorpay-signature");

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return c.json({ error: "Webhook verification failed!" }, 400);
  }

  const event = JSON.parse(body);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const order = await razorpay.orders.fetch(payment.order_id);

    producer.send("payment.successful", {
      value: {
        userId: String(order.notes?.userId ?? ""),
        email: String(order.notes?.email ?? ""),
        amount: payment.amount,
        status: "success",
        products: JSON.parse(String(order.notes?.products ?? "[]")).map(
          (item: { name: string; quantity: number; price: number }) => ({
            name: item.name,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
          })
        ),
      },
    });
  }

  return c.json({ received: true });
});

export default webhookRoute;
