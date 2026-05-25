import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors'
import productRouter from './routes/product.route';
import categoryRouter from './routes/category.route';
import { clerkMiddleware } from '@clerk/express'
import { shouldBeUser } from './middleware/authMiddleware';

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


app.get("/test", shouldBeUser, (req: Request, res: Response) => {
    res.json({ 
        message: "Product Service Authenticated" ,
        userId: req.userId,
    });
});

app.listen(PORT, () => {
    console.log("Product service is running on port: ", PORT);
})