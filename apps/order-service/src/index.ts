import { connectOrderDB } from "@repo/order-db";
import Fastify from "fastify";
import * as Clerk from '@clerk/fastify'
import { orderRoute } from "./routes/order";


const fastify = Fastify();

fastify.register(Clerk.clerkPlugin)

fastify.get("/health", (request, reply) => {
    return reply.status(200).send({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

fastify.get("/test", (request, reply) => {
    const { userId } = Clerk.getAuth(request);
    if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
    return reply.status(200).send({  message: "Authenticated"});
});

fastify.register(orderRoute);

const start = async () => {
    try {
        await connectOrderDB();
        await fastify.listen({ port: 8001 });
        console.log("Order is running on port: 8001");
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();
