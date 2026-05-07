import { Request, Response } from "express";
import { Prisma, prisma } from "@repo/db";

// Controller handlers for product-related REST endpoints.
// These methods validate request payloads, interact with Prisma,
// and return JSON responses with proper HTTP status codes.

export const createProduct = async (req: Request, res: Response) => {
    try {
        // Parse and type the incoming create payload from the request body.
        const data: Prisma.ProductCreateInput = req.body;

        const { colors, images } = data;

        // Ensure the request includes a non-empty colors array.
        if (!colors || !Array.isArray(colors) || colors.length === 0) {
            return res.status(400).json({ message: "Colors array is required" });
        }

        // Ensure images is provided as an object so color-based image mapping can be validated.
        if (!images || typeof images !== "object") {
            return res.status(400).json({ message: "Images object is required!" });
        }

        // Verify that every color has a corresponding image entry.
        const missingColors = colors.filter((color) => !(color in images));
        if (missingColors.length > 0) {
            return res.status(400).json({ message: "Missing images for color", missingColors });
        }

        const product = await prisma.product.create({ data });

        return res.status(200).json({ message: "Product created successfully", product });
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data: Prisma.ProductUpdateInput = req.body;

        // Update an existing product by numeric ID with the provided payload.
        const updateProduct = await prisma.product.update({
            where: { id: Number(id) },
            data,
        });

        return res.status(200).json({ message: "Product is updated successfully", updateProduct });
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deleteProduct = await prisma.product.delete({
            where: { id: Number(id) },
        });

        return res.status(200).json({ message: "Product is deleted successfully", deleteProduct });
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { sort, category, search, limit } = req.query;

        // Determine sort order based on query string values.
        const orderBy = (() => {
            switch (sort) {
                case "asc":
                    return { price: Prisma.SortOrder.asc };
                case "desc":
                    return { price: Prisma.SortOrder.desc };
                case "oldest":
                    return { createdAt: Prisma.SortOrder.asc };
                default:
                    return { createdAt: Prisma.SortOrder.desc };
            }
        })();

        const products = await prisma.product.findMany({
            where: {
                category: {
                    slug: category as string,
                },
                name: {
                    contains: search as string,
                    mode: "insensitive",
                },
            },
            orderBy,
            take: limit ? Number(limit) : undefined,
        });

        return res.status(200).json({ message: "All products fetched successfully", products });
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
        });

        return res.status(200).json({ message: "Product is fetched successfully", product });
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};