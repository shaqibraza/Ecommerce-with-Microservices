import Fastify from "fastify";
import cors from "@fastify/cors";
import Clerk from "@clerk/fastify";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { connectOrderDB } from "@repo/order-db";
import { orderRoute } from "./routes/order.js";
import { consumer, producer } from "./utils/kafka.js";
import { runKafkaSubscriptions } from "./utils/subscriptions.js";

const fastify = Fastify();

fastify.register(cors, {
  origin: ["http://localhost:3002"],
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

fastify.register(Clerk.clerkPlugin);

fastify.get("/health", (request, reply) => {
  return reply.status(200).send({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

fastify.get("/test", { preHandler: shouldBeUser }, (request, reply) => {
  return reply.send({
    message: "Order service is authenticated!",
    userId: request.userId,
  });
});

fastify.register(orderRoute);

const start = async () => {
  try {
    console.log("Starting order service with env:", {
      hasMongoUrl: !!process.env.MONGO_URL,
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
    });

    await Promise.all([
      connectOrderDB(),
      producer.connect(),
      consumer.connect(),
    ]);
    await runKafkaSubscriptions();
    await fastify.listen({ port: 8005, host: "127.0.0.1" });
    console.log("Order service is running on port: 8005");
  } catch (error) {
    console.error("Order service startup failed:", error);
    process.exit(1);
  }
};
start();
