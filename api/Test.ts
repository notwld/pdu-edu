import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import bycrpt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const authorize = require('../middleware/auth');


router.post('/create-test',authorize, async (req: Request, res: Response) => {
    try {
        const test = await prisma.test.create({
            data: {
                name: req.body.name,
                description: req.body.description,
                duration: req.body.duration,
                Course:{
                    connect:{
                        id:Number(req.body.course)
                    }
                }
            },

        });
        if(!test){
            res.status(404).json({ message: 'Test not found',status:404 });
            return;
        }

        const students = await prisma.user.findMany({
            where:{
                coursesTaken:{
                    some:{
                        id:Number(req.body.course)
                    }
                }

            }
        });

        students.forEach(async (student) => {
            console.log(student);
            const notification = await prisma.notification.create({
                data:{
                    message:`New test ${req.body.name} is available`,
                    link:`/test/${test.id}`,
                    user:{
                        connect:{
                            id:student.id
                        }
                    }
                }
            });
            console.log(notification);
        });

        res.status(201).json(test);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.get('/get-tests', authorize, async (req: Request, res: Response) => {
    try {
        const tests = await prisma.test.findMany({
            include:{
                Course:{
                    select:{
                        title:true
                    }
                }
            }

        });
        res.json(tests);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});
router.put('/update-test/:id', authorize, async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const test = await prisma.test.update({
            where: {
                id: parseInt(req.params.id),
            },
            data: {
                name: req.body.name,
                description: req.body.description,
                duration: req.body.duration,
                Course:{
                    connect:{
                        id:Number(req.body.course)
                    }
                }
            },
        });
        res.json(test);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.delete('/delete-test/:id', authorize, async (req: Request, res: Response) => {
    try {
        const test = await prisma.test.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!test) {
            res.status(404).json({ message: 'Test not found',status:404 });
            return;
        }
        res.json(test);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.get('/get-test/', authorize, async (req: Request, res: Response) => {
    try {
        const user_id = req.session.user_id;
        const test = await prisma.test.findMany({
            where: {
                id: user_id,
            },
        });
        if(!test){
            res.status(404).json({ message: 'Test not found',status:404 });
            return;
        }

        // console.log(user);
        res.json(test);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);


export default router;