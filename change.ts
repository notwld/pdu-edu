import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
    try {
        // Update the course title from "PMP Exam Prep Extended 4-Month Course" to "PMP Exam Prep 3-Month Course (Online Self-Paced Instruction)"
        const updateResult = await prisma.course.updateMany({
            where: {
                title: "PMP® Exam Prep Online Course"
            },
            data: {
                title: "PMP Exam Prep Course (35hrs of Live Instruction – 3-Month Access)",
                slug: "pmp-exam-prep-course-35hrs-of-live-instruction-3-month-access"
            }
        });

        console.log(`Updated ${updateResult.count} course(s)`);

        // Display all courses after the update
        const courses = await prisma.course.findMany({
            select: {
                title: true,
            }
        });
        
        console.log("All courses after update:");
        courses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.title}`);
        });

    } catch (error) {
        console.error("Error updating courses:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();