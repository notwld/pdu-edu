import { Router, Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
// import jwt from 'jsonwebtoken';
// import bcyrpt from 'bcrypt';
import multer from 'multer';
const authorize = require('../middleware/auth');
import fs from 'fs';
import sendEmail from "../helper/email";
const path = require("path");

const { subDays, startOfWeek, endOfWeek } = require('date-fns');


const router = Router();
const prisma = new PrismaClient();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        // Generate a unique filename to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Add file size limits and error handling
const uploadMiddleware = multer({ 
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max file size
        files: 50 // Maximum 50 files
    }
});

router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const lastWeekStart = subDays(thisWeekStart, 7);
        const lastWeekEnd = subDays(thisWeekEnd, 7);
        // Total Revenue
        const totalRevenue = await prisma.course.aggregate({
            _sum: {
                price: true,
            },
            where: {
                students: {
                    some: {},  // Courses with at least one student enrolled
                },
            },
        });




        const activeUsers = await prisma.user.count({
            where: {
                coursesTaken: {
                    some: {},  // Users who have enrolled in at least one course
                },
            },
        });

        const enrollments = await prisma.enrollment.findMany({
            include: {
                course: true
            }
        });
        const thisWeekDailySales = await prisma.enrollment.groupBy({
            by: ['createdAt'],
            _sum: { subtotal: true },
            where: {
                createdAt: {
                    gte: thisWeekStart,
                    lte: thisWeekEnd,
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const lastWeekDailySales = await prisma.enrollment.groupBy({
            by: ['createdAt'],
            _sum: { subtotal: true },
            where: {
                createdAt: {
                    gte: lastWeekStart,
                    lte: lastWeekEnd,
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const topCoursesData = await prisma.course.findMany({
            select: {
                title: true,
                totalEnrolled: true,
                totalRating: true,
                reviews: {
                    select: {
                        id: true,
                        rating: true,
                    },
                },
                Enrollment: {
                    select: {
                        id: true,
                        createdAt: true
                    }
                }
            },

        });
        // Transform data for frontend
        const formattedCoursesData = topCoursesData.map(course => ({
            title: course.title,
            totalEnrolled: course.Enrollment.length,
            rating: course.reviews.reduce((acc, review) => acc + review.rating, 0) / course.reviews.length,
            reviews: course.reviews.length,
        }));
        console.log(formattedCoursesData);
        // Return all the collected stats
        const allCoursesCount = await prisma.course.count();
        const recentEnrollmentsData = await prisma.enrollment.findMany({
            select: {
              id: true,
              createdAt: true,
              status: true,
              paymentType: true,
              course: {
                select: {
                  title: true,
                  price: true,
                },
              },
              user: {
                select: {
                  name: true, // Assuming you want to show the user's name
                },
              },
            },
            orderBy: {
              createdAt: 'desc', // Order by most recent
            },
            take: 5, // Limit to 5 most recent enrollments
          });
        res.json({
            totalRevenue: totalRevenue._sum.price,
            activeUsers,
            enrollments,
            thisWeekSales: thisWeekDailySales,
            lastWeekSales: lastWeekDailySales,
            topCoursesData: formattedCoursesData,
            allCoursesCount,
            recentEnrollmentsData
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post("/create-course", authorize, (req: any, res: any) => {
    uploadMiddleware.array("files")(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    message: "File is too large. Maximum size is 500MB",
                    status: 400 
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    message: "Too many files. Maximum is 50 files",
                    status: 400 
                });
            }
            return res.status(400).json({ 
                message: `Upload error: ${err.message}`,
                status: 400 
            });
        } else if (err) {
            // An unknown error occurred
            return res.status(500).json({ 
                message: `Unknown upload error: ${err.message}`,
                status: 500 
            });
        }

        try {
            const course = JSON.parse(req.body.course);
            const uploadDir = "uploads/";
            console.log(course);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }

            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({ message: "At least one file is required", status: 400 });
            }

            // File categorization
            const thumbnail = `/${files[0].path}`; // First file is thumbnail
            let fileIndex = 1;

            let videoFiles = [];
            let bookFiles = [];

            // Process files based on extensions
            for (let i = fileIndex; i < files.length; i++) {
                const file = files[i];
                const ext = path.extname(file.originalname).toLowerCase();

                if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                    videoFiles.push(`/${file.path}`);
                } else if ([".pdf", ".epub", ".docx"].includes(ext)) {
                    bookFiles.push({
                        url: `/${file.path}`,
                        title: file.originalname,
                    });
                }
            }
            // console.log(bookFiles);

            if (!course.chapters || course.chapters.length === 0) {
                return res.status(400).json({ message: "Course must have at least one chapter", status: 400 });
            }

            const chapters = course.chapters.map((chapter: any) => {
                return {
                    title: chapter.title,
                    modules: chapter.modules.map((module: any) => {
                        const videoUrl = videoFiles[fileIndex - 1] || null;
                        fileIndex++;

                        return {
                            title: module.title,
                            videoUrl,
                            duration: module.duration,
                            points: module.points,
                        };
                    }),
                };
            });

            const instructors = [];
            if (course.instructor && course.instructor.id) {
                instructors.push(course.instructor);
            }

            const savedCourse = await prisma.course.create({
                data: {
                    title: course.title,
                    thumbnail,
                    slug: course.slug,
                    description: course.description,
                    totalEnrolled: course.totalEnrolled || 0,
                    keyFeatures: course.keyFeatures,
                    books: {
                        create: bookFiles.map((book: any) => ({
                            title: book.title,
                            url: book.url,
                        })),
                    },
                    resources: {
                        create: course.resourses.map((resource: any) => ({
                            title: resource.title,
                            url: resource.url,
                        })),
                    },
                    targetAudience: course.targetAudience || null,
                    accessibility: course.accessibility || null,
                    duration: course.duration || 0,
                    deadline: course.deadline || null,
                    instructors: {
                        connect: instructors.filter(instructor => instructor?.id).map((instructor: any) => ({
                            id: instructor.id,
                        })),
                    },
                    level: course.level || "Beginner",
                    language: course.language || "English",
                    category: course.category || null,
                    price: course.price || 0,
                    totalDuration: Math.ceil(course.totalDuration || 0),
                    // Add timing fields
                    scheduleDays: course.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday"],
                    startTime: course.startTime || "10:00",
                    endTime: course.endTime || "18:00",
                    timezone: course.timezone || "EST",
                    startDate: course.startDate || null,
                    endDate: course.endDate || null,
                    chapters: {
                        create: chapters.map((chapter: any) => ({
                            title: chapter.title,
                            modules: {
                                create: chapter.modules.map((module: any) => ({
                                    title: module.title,
                                    videoUrl: module.videoUrl,
                                    duration: module.duration,
                                    points: module.points,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    chapters: {
                        include: {
                            modules: true,
                        },
                    },
                },
            });

            if (!savedCourse) {
                return res.status(400).json({ message: "Course could not be created", status: 400 });
            }

            res.status(201).json({ savedCourse });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error", status: 500 });
        }
    });
});

router.get("/get-courses", authorize, async (req: Request, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                chapters: {
                    include: {
                        modules: true,
                    },
                },
                instructors: true,
                resources: true,
                books: true,
            },
        });
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});

router.get("/get-courses-names", async (req: Request, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
            },
        });
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});

router.get("/get-course/:slug", async (req: any, res: any) => {
    try {
        const { slug } = req.params;
        console.log(slug);
        const course = await prisma.course.findFirst({
            where: { slug },
            include: {
                chapters: {
                    include: {
                        modules: true,
                    },
                },
                reviews: true,
                instructors: true,
                resources:true,
                books:true
            },
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found", status: 404 });
        }
        console.dir(course, { depth: null });
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});


router.put("/update-course/:id", authorize, (req: any, res: any) => {
    uploadMiddleware.array("files")(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    message: "File is too large. Maximum size is 500MB",
                    status: 400 
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    message: "Too many files. Maximum is 50 files",
                    status: 400 
                });
            }
            return res.status(400).json({ 
                message: `Upload error: ${err.message}`,
                status: 400 
            });
        } else if (err) {
            return res.status(500).json({ 
                message: `Unknown upload error: ${err.message}`,
                status: 500 
            });
        }

        try {
            const { id } = req.params;
            const course = JSON.parse(req.body.course);
            const files = req.files;

            // Find the course to update
            const findCourse = await prisma.course.findUnique({
                where: { id: parseInt(id) },
                include: {
                    chapters: {
                        include: {
                            modules: true,
                        },
                    },
                    instructors: true,
                    resources: true,
                },
            });

            if (!findCourse) {
                return res.status(404).json({ message: "Course not found", status: 404 });
            }

            // Determine the thumbnail: new or retain old
            const thumbnail = files[0] ? `/${files[0].path}` : findCourse.thumbnail;


            // Validate file existence if using old thumbnail
            if (!files?.[0] && !fs.existsSync(`.${findCourse.thumbnail}`)) {
                return res.status(400).json({ message: "Thumbnail file not found", status: 400 });
            }

            // Map chapters and retain video paths if no new file is uploaded
            let fileIndex = 1;
            const chapters = course.chapters.map((chapter: any, chapterIndex: number) => ({
                title: chapter.title,
                modules: chapter.modules.map((module: any, moduleIndex: number) => {
                    // Keep existing video URL if no new file is provided
                    const existingModule = findCourse.chapters[chapterIndex]?.modules[moduleIndex];
                    let videoUrl = '/uploads/default-video.mp4'; // Default value

                    if (files[fileIndex]) {
                        videoUrl = `/${files[fileIndex].path}`;
                        fileIndex++;
                    } else if (module.videoUrl) {
                        videoUrl = module.videoUrl;
                    } else if (existingModule?.videoUrl) {
                        videoUrl = existingModule.videoUrl;
                    }

                    return {
                        title: module.title,
                        videoUrl,
                        duration: module.duration || 0,
                        points: module.points || [],
                    };
                }),
            }));

            // Delete existing chapters and modules explicitly
            await prisma.module.deleteMany({
                where: { chapterId: { in: findCourse.chapters.map((ch) => ch.id) } },
            });
            await prisma.chapter.deleteMany({
                where: { courseId: parseInt(id) },
            });

            // Update course data
            const updatedCourse = await prisma.course.update({
                where: { id: parseInt(id) },
                data: {
                    title: course.title,
                    thumbnail,
                    slug: course.slug,
                    description: course.description,
                    resources: {
                        deleteMany: {},
                        create: course.resourses.map((resource: any) => ({
                            title: resource.title,
                            url: resource.url,
                        })),
                    },
                    totalEnrolled: course.totalEnrolled || 0,
                    keyFeatures: course.keyFeatures,
                    targetAudience: course.targetAudience || null,
                    accessibility: course.accessibility || null,
                    duration: Number(course.duration) || 0,
                    deadline: new Date(course.deadline) || null,
                    instructors: {
                        connect: course.instructor && course.instructor.id ? [{ id: course.instructor.id }] : [],
                    },
                    level: course.level || "Beginner",
                    language: course.language || "English",
                    category: course.category || null,
                    price: course.price || 0,
                    totalDuration: Math.ceil(course.totalDuration || 0),
                    // Add timing fields
                    scheduleDays: course.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday"],
                    startTime: course.startTime || "10:00",
                    endTime: course.endTime || "18:00",
                    timezone: course.timezone || "EST",
                    startDate: course.startDate || null,
                    endDate: course.endDate || null,
                    chapters: {
                        create: chapters.map((chapter: any) => ({
                            title: chapter.title,
                            modules: {
                                create: chapter.modules.map((module: any) => ({
                                    title: module.title,
                                    videoUrl: module.videoUrl,
                                    duration: module.duration,
                                    points: module.points,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    chapters: {
                        include: {
                            modules: true,
                        },
                    },
                    instructors: true,
                },
            });

            if (!updatedCourse) {
                return res.status(400).json({ message: "Course could not be updated", status: 400 });
            }

            res.status(200).json(updatedCourse);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error", status: 500 });
        }
    });
});



router.delete("/delete-course/:id", authorize, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find and delete modules for all chapters related to the course
        const chapters = await prisma.chapter.findMany({
            where: { courseId: parseInt(id) },
        });
        const chapterIds = chapters.map((chapter) => chapter.id);
        await prisma.test.deleteMany({
            where: {
                courseId: parseInt(id),
            }
        },
        );
        await prisma.book.deleteMany
            ({
                where: {
                    courseId: parseInt(id),
                }
            },
            );

        await prisma.module.deleteMany({
            where: { chapterId: { in: chapterIds } },
        });
        await prisma.resourse.deleteMany({
            where: { courseId: parseInt(id) },
        });
        // Delete chapters after modules are deleted
        await prisma.chapter.deleteMany({
            where: { courseId: parseInt(id) },
        });
        await prisma.enrollment.deleteMany({
            where: { courseId: parseInt(id) },
        });
        await prisma.review.deleteMany({
            where: { courseId: parseInt(id) },
        });
        await prisma.certificate.deleteMany({
            where: { courseId: parseInt(id) },
        });

        await prisma.userProgress.deleteMany({
            where: { courseId: parseInt(id) },
        });

        // await prisma.enrollment.deleteMany({
        //     where: { courseId: parseInt(id) },
        // });


        // Finally, delete the course
        const course = await prisma.course.delete({
            where: { id: parseInt(id) },
        });

        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});


router.post('/progress/mark-complete', async (req, res) => {
    var { userId, courseId, chapterIndex, moduleIndex, completed } = req.body;
    chapterIndex = parseInt(chapterIndex);
    moduleIndex = parseInt(moduleIndex);

    try {
        // Update or insert the completion status for the module
        await prisma.userProgress.upsert({
            where: {
                userId_courseId_chapterIndex_moduleIndex: {
                    userId,
                    courseId,
                    chapterIndex,
                    moduleIndex,
                },
            },
            update: { completed },
            create: { userId, courseId, chapterIndex, moduleIndex, completed },
        });

        // Calculate the total number of modules in the course
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                chapters: {
                    include: { modules: true },
                },
            },
        });

        const totalModules = course?.chapters.reduce((total, chapter) => {
            return total + chapter.modules.length;
        }, 0) || 0;

        // Count completed modules for the user in this course
        const completedModules = await prisma.userProgress.count({
            where: { userId, courseId, completed: true },
        });

        const progress = Math.round((completedModules / totalModules) * 100);

        // Issue a certificate if progress reaches 100%
        if (progress == 100) {
            const existingCertificate = await prisma.certificate.findFirst({
                where: { userId, courseId },
            });

            if (!existingCertificate) {
                await prisma.certificate.create({
                    data: {
                        userId,
                        courseId,
                        certificateUrl: `/certificate/${courseId}-${userId}.pdf`,
                    },
                });
            }
        }

        res.status(200).json({ success: true, progress });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/progress/:userId/:courseId', async (req, res) => {
    const { userId, courseId } = req.params;

    try {
        // Fetch total modules in the course
        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: {
                chapters: { include: { modules: true } },
            },
        });

        const totalModules = course?.chapters.reduce((total, chapter) => {
            return total + chapter.modules.length;
        }, 0) || 0;

        // Fetch completed modules for the user
        const completedModules = await prisma.userProgress.count({
            where: { userId: parseInt(userId), courseId: parseInt(courseId), completed: true },
        });

        const progress = Math.round((completedModules / totalModules) * 100);

        res.status(200).json({ success: true, progress });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get("/request-certificate/:userId/:courseId", async (req: any, res: any) => {
    const { userId, courseId } = req.params;
    try {
        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: {
                instructors: true
            }
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found", status: 404 });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
        });
        sendEmail(user?.email, "Certificate Request", {
            recipientName: user?.name,
            courseName: course?.title,
            instructorName: course?.instructors[0].name,
            date: new Date().toDateString(),
            institutionName: "PDU",
        },
            false, true);
        res.redirect(`/my-learnings/course/${course.slug}/dashboard`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
})

// Get all reviews grouped by course
router.get("/reviews", authorize, async (req: Request, res: Response) => {
    try {
        // Fetch all courses with their reviews
        const coursesWithReviews = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                thumbnail: true,
                reviews: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            // Only include courses that have at least one review
            where: {
                reviews: {
                    some: {}
                }
            }
        });

        res.json(coursesWithReviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});

// Update review status (approve/reject)
router.put("/review/:id", authorize, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate input
        if (!status || !["Approved", "Rejected", "Pending"].includes(status)) {
            return res.status(400).json({ 
                message: "Invalid status. Status must be 'Approved', 'Rejected', or 'Pending'", 
                status: 400 
            });
        }

        // Update the review status - handle case where status field might not exist in database yet
        const updatedReview = await prisma.review.update({
            where: { id: parseInt(id) },
            data: {
                // Only include status if it exists in the database schema
                ...(await doesColumnExist('Review', 'status') ? { status } : {})
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                course: {
                    select: {
                        title: true,
                        id: true,
                        slug: true
                    }
                }
            }
        });

        // If approving review, recalculate course rating
        if (status === "Approved") {
            const courseId = updatedReview.courseId;
            
            // Get all approved reviews for this course - handle case where status field might not exist
            const approvedReviews = await doesColumnExist('Review', 'status') 
                ? await prisma.review.findMany({
                    where: {
                        courseId,
                        status: "Approved"
                    }
                })
                : await prisma.review.findMany({
                    where: {
                        courseId
                    }
                });
            
            // Calculate average rating
            const totalRating = approvedReviews.reduce((acc, review) => acc + review.rating, 0);
            const averageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;
            
            // Update course's total rating
            await prisma.course.update({
                where: { id: courseId },
                data: { totalRating: averageRating }
            });
            
            // Create notification for the user - add null safety checks
            if (updatedReview.student && updatedReview.student.email && updatedReview.course) {
                await prisma.notification.create({
                    data: {
                        message: `Your review for "${updatedReview.course.title}" has been approved.`,
                        link: `/courses/${updatedReview.course?.slug}`,
                        userId: updatedReview.studentId
                    }
                });
            }
        }

        res.json({
            message: `Review ${status.toLowerCase()} successfully`,
            review: updatedReview
        });
    } catch (error) {
        console.error("Error updating review status:", error);
        res.status(500).json({ message: "Internal server error", status: 500 });
    }
});

// Helper function to check if a column exists in a table
async function doesColumnExist(table: string, column: string): Promise<boolean> {
    try {
        // Try a simple query that would fail if the column doesn't exist
        // This is a workaround since Prisma doesn't provide direct schema introspection
        if (table === 'Review' && column === 'status') {
            await prisma.$queryRaw`SELECT status FROM "Review" LIMIT 1`;
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

export default router;
