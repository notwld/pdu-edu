import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import bycrpt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

const authorize = require('../middleware/auth');


router.post('/create-user',authorize, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                email: req.body.email,
            },
        });
        
        if (user !== null) {
            res.status(400).json({ message: 'User already exists',status:400 });
            return; 
        }
        if(!req.body.roleId){
            res.status(400).json({ message: 'Role ID is required',status:400 });
            return
        }

        if(!req.body.password || req.body.password !== req.body.confirmPassword ){
            res.status(400).json({ message: 'Passwords do not match',status:400 });
            return
        }
        const salt = await bycrpt.genSalt(10);
        const hashedPassword = await bycrpt.hash(req.body.password, salt);
        const newUser = await prisma.user.create({
            data: {
                email: req.body.email,
                name: req.body.username,
                password: hashedPassword,
                role: {
                    connect: {
                        id: req.body.roleId,
                    },
                },
            },
            include: {
                role: true,
            },
        });
        // console.log(newUser);
        res.status(201).json(newUser); 
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.get('/get-users', authorize, async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                role: {
                    include: {
                        permissions: true,
                    }
                }
            },
        });
        // console.log(users);
        res.json(users);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});
router.put('/update-user/:id', authorize, async (req: Request, res: Response) => {
    try {
        const salt = await bycrpt.genSalt(10);
        const hashedPassword = await bycrpt.hash(req.body.password, salt);
        const user = await prisma.user.update({
            where: {
                id: parseInt(req.params.id),
            },
            data: {
                email: req.body.email,
                name: req.body.username,
                password: hashedPassword,
                role: {
                    connect: {
                        id: req.body.roleId,
                    },
                },
            },
            include: {
                role: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found',status:404 });
            return;
        }
        // console.log(user);
        res.json(user);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});
router.delete('/delete-user/:id', authorize, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found',status:404 });
            return;
        }
        await prisma.userProgress.deleteMany({
            where: {
                userId: user.id,
            }
        });

        await prisma.notification.deleteMany({
            where: {
                userId: user.id,
            }
        });

        await prisma.participant.deleteMany({
            where: {
                businessEmail: user.email,
            }
        });
        await prisma.billing.deleteMany({
            where: {
                businessEmail: user.email,
            }
        });

        await prisma.enrollment.deleteMany({
            where: {
                userId: user.id,
            }
        });

        await prisma.user.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });



        // console.log(user);
        res.json({
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.get('/get-user/', authorize, async (req: Request, res: Response) => {
    try {
        const user_id = req.session.user_id;
        const user = await prisma.user.findUnique({
            where: {
                id: user_id,
            },
            include: {
                role: {
                    include: {
                        permissions: true,
                    }
                }
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found',status:404 });
            return;
        }
        // console.log(user);
        res.json(user);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);


export default router;