import 'dotenv/config';
import express from 'express';
import cors from 'cors'
import productRouter from './routes/product.route';
import categoryRouter from './routes/category.route';
import { clerkMiddleware, getAuth } from '@clerk/express'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ["http://localhost:3002", "http://localhost:3003"],
    credentials: true,
}));
app.use(express.json())
app.use(clerkMiddleware());


app.use("/products", productRouter  );
app.use("/categories", categoryRouter);


app.get("/test", (req, res) => {
    const auth = getAuth(req)
    const userId = auth.userId
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ message: "Product Service Authenticated" });
});

app.listen(PORT, () => {
    console.log("Product service is running on port: ", PORT);
})