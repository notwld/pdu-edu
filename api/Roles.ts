import { Request,Response,Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();
const authorize = require('../middleware/auth');

router.get('/get-roles', authorize, async (req: Request, res: Response) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: true,
            },
        });
        res.json(roles);
        // console.log(roles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);

router.post('/create-role', authorize, async (req: Request, res: Response) => {
    try {
        const role = await prisma.role.findFirst({
            where: {
                name: req.body.name,
            },
        });

        if (role !== null) {
            res.status(400).json({ message: 'Role already exists',status:400 });
            return;
        }

        const newRole = await prisma.role.create({
            data: {
                name: req.body.name,
            },
        });

        res.status(201).json(newRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);
router.put('/update-role/:id', authorize, async (req: Request, res: Response) => {
    try {
        const role = await prisma.role.findUnique({
            where: {
                id: Number(req.params.id),
            },
        });

        if (role === null) {
            res.status(400).json({ message: 'Role does not exist',status:400 });
            return;
        }

        const updatedRole = await prisma.role.update({
            where: {
                id: Number(req.params.id),
            },
            data: {
                name: req.body.name,
            },
        });

        res.json(updatedRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);
router.delete('/delete-role/:id', authorize, async (req: Request, res: Response) => {
    try {
        const role = await prisma.role.findUnique({
            where: {
                id: Number(req.params.id),
            },
        });
        if(req.params.id==null){
            res.status(400).json({ message: 'Role ID is required',status:400 });
            return
        }
        if (role === null) {
            res.status(400).json({ message: 'Role does not exist',status:400 });
            return;
        }

        await prisma.role.delete({
            where: {
                id: Number(req.params.id),
            },
        });

        res.status(204).json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
}
);
export default router;