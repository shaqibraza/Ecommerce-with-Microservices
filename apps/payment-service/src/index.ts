import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'

const app = new Hono()
app.use('*', clerkMiddleware())

app.get('/health', (c) => {
    return c.json({
        status: "OK",
        uptime: process.uptime(),
        timestamp: Date.now()
    })
})

app.get('/test', (c) => {
    const { userId } = getAuth(c)

    if (!userId) {
        return c.json({
            message: 'You are not logged in.',
        })
    }

    return c.json({
        message: 'Payment Service is Authenticated!',
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
