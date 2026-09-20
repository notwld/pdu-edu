import { Router, Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { stat } from "node:fs";
import sendEmail from "../helper/email";
import { connect } from "node:http2";
const authorize = require('../middleware/auth');



const router = Router();
const prisma = new PrismaClient();


router.get("/all-enrollments", authorize, async (req: Request, res: Response) => {
    try {
        const enrollments = await prisma.enrollment.findMany(
            {
                include: {
                    course: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    billing: true,
                    participants: true
                }
            }
        );
        res.json(enrollments);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});


router.put("/update-enrollment/:id", authorize, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log(status);
        const enrollment = await prisma.enrollment.update({
            where: {
                id: parseInt(id)
            },
            data: {
                status: status
            },
            include: {
                participants: true
            }
        });
        if (status == 'paid') {
            const course = await prisma.course.findFirst({
                where: {
                    id: enrollment.courseId
                }
            });
            if (course) {
                enrollment.participants.forEach(async (participant: any) => {
                    const user = await prisma.user.findFirst({
                        where: {
                            email: participant.businessEmail
                        }
                    });
                    if (user) {
                        await prisma.user.update({
                            where: {
                                id: user.id
                            },
                            data: {
                                coursesTaken: {
                                    connect: {
                                        id: course.id
                                    }
                                }

                            }
                        })
                    }
                })
            }
            console.log("course connected");
            
        }
        if (status == 'cancel') {
            const course = await prisma.course.findFirst({
                where: {
                    id: enrollment.courseId
                }
            });
            if (course) {
                enrollment.participants.forEach(async (participant: any) => {
                    const user = await prisma.user.findFirst({
                        where: {
                            email: participant.businessEmail
                        }
                    });
                    if (user) {
                        await prisma.user.update({
                            where: {
                                id: user.id
                            },
                            data: {
                                coursesTaken: {
                                    disconnect: {
                                        id: course.id
                                    }
                                }

                            }
                        })
                    }
                })
            }
            console.log("course disconnected");
        }
        if (status == 'pending') {
            const course = await prisma.course.findFirst({
                where: {
                    id: enrollment.courseId
                }
            });
            if (course) {
                enrollment.participants.forEach(async (participant: any) => {
                    const user = await prisma.user.findFirst({
                        where: {
                            email: participant.businessEmail
                        }
                    });
                    if (user) {
                        await prisma.user.update({
                            where: {
                                id: user.id
                            },
                            data: {
                                coursesTaken: {
                                    disconnect: {
                                        id: course.id
                                    }
                                }

                            }
                        })
                    }
                })
            }
            console.log("course disconnected");
        }
        res.json(enrollment);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
}
);

export default router;
