import { createKafkaClient, createProducer } from "@repo/kafka";

const kafkaClient = createKafkaClient("payment-service");

export const producer = createProducer(kafkaClient);
