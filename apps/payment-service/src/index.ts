import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { shouldBeUser } from './middleware/authMiddleware'

const app = new Hono()
app.use('*', clerkMiddleware())

app.get('/health', (c) => {
    return c.json({
        status: "OK",
        uptime: process.uptime(),
        timestamp: Date.now()
    })
})

app.get('/test', shouldBeUser, (c) => {
    return c.json({
        message: 'Payment Service is Authenticated!',
        userId: c.get("userId")
    })
})

const start = async () => {
    try {
        serve({ fetch: app.fetch, port: 8002 }, (info) => {
            console.log("Payment Service is running on port: 8002")
        });
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

start();
