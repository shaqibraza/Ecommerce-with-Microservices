import { Router } from 'express';
import { 
    createCategory, 
    deleteCategory, 
    getAllCategories, 
    updateCategory 
} from '../controllers/category.controller';
import { shouldBeAdmin } from '../middleware/authMiddleware';


const router: Router = Router();


router.post("/", shouldBeAdmin, createCategory);
router.put("/:id", shouldBeAdmin, updateCategory);
router.delete("/:id", shouldBeAdmin, deleteCategory);
router.get("/", getAllCategories);


export default router;