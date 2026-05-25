import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';


declare global{
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const shouldBeUser = (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
        return res.json({
            message: 'You are not logged in.',
        })
    }

    req.userId = userId;
    next();
}