import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();
const authorize = require('../middleware/auth');

router.put('/role/:id', authorize, async (req: Request, res: Response) => {
    try {
        const roleId = Number(req.params.id);
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: { permissions: true },
        });

        if (role === null) {
            res.status(400).json({ message: 'Role does not exist', status: 400 });
            return;
        }

        // Clear existing permissions
        await prisma.role.update({
            where: { id: roleId },
            data: { permissions: { deleteMany: {} } },
        });

        const permissions = req.body.items;
        if (!permissions) {
            res.status(400).json({ message: 'Permissions are required', status: 400 });
            return;
        }

        const permissionData = await Promise.all(
            permissions.map(async (permissionName: string) => {
                let permission = await prisma.permission.findUnique({
                    where: { name: permissionName },
                });

                if (!permission) {
                    permission = await prisma.permission.create({
                        data: { name: permissionName },
                    });
                }

                return { id: permission.id };
            })
        );

        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: { permissions: { connect: permissionData } },
            include: { permissions: true },
        });

        res.json(updatedRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

router.get('/role/:id', authorize, async (req: Request, res: Response) => {
    try {
        const role = await prisma.role.findUnique({
            where: {
                id: Number(req.params.id),
            },
            include: {
                permissions: true,
            },
        });
        if (!role) {
            res.status(400).json({ message: 'Role does not exist',status:400 });
            return;
        }
        res.json(role.permissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
})

// router.get('/killswitch', async (req: Request, res: Response) => {
//     try {
//         await prisma.permission.deleteMany();
//         await prisma.role.deleteMany();
//         res.json({ message: 'All permissions and roles have been deleted' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// })
export default router;