import { FastifyReply, FastifyRequest } from "fastify";
import * as Clerk from '@clerk/fastify'


declare module "fastify" {
    interface FastifyRequest {
        userId?: string;
    }
}

export const shouldBeUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = Clerk.getAuth(request);
    if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
    }

    request.userId = userId;
}