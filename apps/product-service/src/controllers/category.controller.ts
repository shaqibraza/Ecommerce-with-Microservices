import { Request, Response } from "express";
import { Prisma, prisma } from "@repo/db";

// Controller handlers for category REST endpoints.
// These methods handle category creation, updating, deletion,
// and retrieval through Prisma.

export const createCategory = async (req: Request, res: Response) => {
    try {
        // The create payload is taken from the request body.
        const data: Prisma.CategoryCreateInput = req.body;

        const category = await prisma.category.create({ data });

        return res.status(200).json(category);
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data: Prisma.CategoryUpdateInput = req.body;

        // Update an existing category by numeric ID.
        const updateCategory = await prisma.category.update({
            where: { id: Number(id) },
            data,
        });

        return res.status(200).json(updateCategory);
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deleteCategory = await prisma.category.delete({
            where: { id: Number(id) },
        });

        return res.status(200).json(deleteCategory);
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        // Fetch all categories from the database.
        const categories = await prisma.category.findMany();

        return res.status(200).json(categories);
    } catch (error: any) {
        console.log(error);
        return res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
};

