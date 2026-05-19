import { connectOrderDB } from "@repo/order-db";
import Fastify from "fastify";


const fastify = Fastify();


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