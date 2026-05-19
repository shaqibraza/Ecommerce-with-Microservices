import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
export const connectOrderDB = async () => {
    if (isConnected) {
        return;
    }
    if (!process.env.MONGO_URL) {
        throw new Error('MONGO_URL environment variable is not defined');
    }

    try {
        await mongoose.connect(process.env.MONGO_URL!);
        isConnected = true;
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};