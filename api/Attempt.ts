import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import bycrpt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const authorize = require('../middleware/auth');

router.get('/get-attempts', authorize, async (req: Request, res: Response) => {
    try {
        
        const attempts = await prisma.attempt.findMany({
            include: {
                Test: true,
                User:true,
                categories:{
                    include:{
                        subCategories:true
                    }
                }
            },
        });
        res.json(attempts);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});


export default router;