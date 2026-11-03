import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const authorize = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

async function usersForEnrollment(enrollment: {
    userId: number | null;
    participants: { businessEmail: string }[];
}): Promise<number[]> {
    const ids = new Set<number>();
    if (enrollment.userId) {
        ids.add(enrollment.userId);
    }
    for (const participant of enrollment.participants) {
        if (!participant.businessEmail) continue;
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: participant.businessEmail,
                    mode: "insensitive",
                },
            },
            select: { id: true },
        });
        if (user) ids.add(user.id);
    }
    return [...ids];
}

async function setCourseAccess(userIds: number[], courseId: number, connect: boolean) {
    const relation = connect
        ? { connect: { id: courseId } }
        : { disconnect: { id: courseId } };
    await Promise.all(
        userIds.map((id) =>
            prisma.user.update({
                where: { id },
                data: { coursesTaken: relation },
            })
        )
    );
}

router.get("/all-enrollments", authorize, async (req: Request, res: Response) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            include: {
                course: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                billing: true,
                participants: true,
            },
        });
        res.json(enrollments);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

router.put("/update-enrollment/:id", authorize, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const enrollment = await prisma.enrollment.update({
            where: {
                id: parseInt(id),
            },
            data: {
                status: status,
            },
            include: {
                participants: true,
            },
        });

        const userIds = await usersForEnrollment(enrollment);

        if (status == "paid") {
            await setCourseAccess(userIds, enrollment.courseId, true);
        }
        if (status == "cancel" || status == "pending") {
            await setCourseAccess(userIds, enrollment.courseId, false);
        }

        res.json(enrollment);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

export default router;
