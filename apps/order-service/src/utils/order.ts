import { Order } from "@repo/order-db";
import { OrderType } from "@repo/types";
import { producer } from "./kafka";

export const createOrder = async (order: OrderType) => {
  console.log("Creating order:", order);
  const newOrder = new Order(order);

  try {
    const order = await newOrder.save();
    console.log("Saved order:", order);
    console.log("Order saved:", order._id);
    await producer.send("order.created", {
      value: {
        email: order.email,
        amount: order.amount,
        status: order.status,
      },
    });
} catch (error) {
    console.error("Order save failed:", error);
    throw error;
  }
};
