import { Router,Request,Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';
import bcyrpt from 'bcryptjs';


const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;
        console.log(email, password);
        // await prisma.user.findMany().then((users) => {
        //     console.log(users);
        // });
        if (!email || !password) {
            res.status(400).json({ message: 'Please fill all the fields', status: 400 });
            return;
        }
        const user = await prisma.user.findUnique({
            where: {
                email: email
            },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            res.status(400).json({ message: 'User not found', status: 400 });
            return;
        }
        const validPassword = await bcyrpt.compare(password, user.password);
        if (!validPassword) {
            res.status(400).json({ message: 'Invalid Password', status: 400 });
            return;
        }
        const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET || "JWT_SECRET");
        req.session.token = token;
       
        res.status(200).json({ token , user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

router.get('/logout', async (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ message: 'Internal server error', status: 500 });
            return;
        }
        res.status(200).json({ message: 'Logged out', status: 200 });
    });
}
);

export default router;