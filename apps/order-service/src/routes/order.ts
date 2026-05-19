import { FastifyInstance } from "fastify";
import { Order } from "@repo/order-db"

export const orderRoute = async (fastify: FastifyInstance) => {
    fastify.get(
        "/user-orders",
        async (request, reply) => {
            const orders = await Order.find();
            return reply.send(orders);
        }
    );

    fastify.get(
        "/orders",
        async (request, reply) => {
            const orders = await Order.find();
            return reply.send(orders);
        }
    );
};