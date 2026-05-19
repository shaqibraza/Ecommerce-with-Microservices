import { connectOrderDB } from "@repo/order-db";
import Fastify from "fastify";
import { orderRoute } from "./routes/order";


const fastify = Fastify();


fastify.register(orderRoute);


const start = async () => {
    try {
        await connectOrderDB();
        await fastify.listen({ port: 8001 });
        console.log("Order is running on port: 8001");
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    };
};

start();