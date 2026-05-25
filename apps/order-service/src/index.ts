import { connectOrderDB } from "@repo/order-db";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import * as Clerk from '@clerk/fastify'
import { orderRoute } from "./routes/order";
import { shouldBeUser } from "./middleware/authmiddleware";


const fastify = Fastify();

fastify.register(Clerk.clerkPlugin)

fastify.get("/health", (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

fastify.get("/test", { preHandler: shouldBeUser}, (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({  
        message: "Authenticated",
        userId: request.userId
    });
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
