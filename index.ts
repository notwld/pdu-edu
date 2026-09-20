import express, { RequestHandler, Router } from 'express';
import http from 'node:http';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import cors from 'cors';
import User from './api/User';
import Role from './api/Roles';
import Permission from './api/Permissions';
import Auth from './api/Auth';
import Test from './api/Test';
import MCQ from './api/MCQ';
import Attempt from './api/Attempt';
import Course from './api/Course';
import Enrollment from "./api/Enrollments";
import Forum from './api/Forum';
import Coupons from './api/Coupons';
import multer from 'multer';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import jwt from 'jsonwebtoken';
import bcyrpt from 'bcryptjs';
import countries from "./public/assets/js/countries";
import { PrismaClient } from '@prisma/client';
import { connect } from 'node:http2';

dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pb_key = process.env.STRIPE_PUBLISHABLE_KEY;
const prisma = new PrismaClient();
const prismaAny: any = prisma;

class PrismaSessionStore extends session.Store {
    constructor() {
        super();
    }

    async get(sid: any, callback: any) {
        try {
            const session = await prisma.session.findUnique({
                where: { id: sid },
            });
            if (!session) return callback(null, null);
            callback(null, JSON.parse(session.data));
        } catch (err) {
            callback(err);
        }
    }

    async set(sid: any, sessionData: any, callback: any) {
        try {
            const expiresAt = new Date(Date.now() + sessionData.cookie.maxAge);
            await prisma.session.upsert({
                where: { id: sid },
                update: { data: JSON.stringify(sessionData), expiresAt },
                create: { id: sid, data: JSON.stringify(sessionData), expiresAt },
            });
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    async destroy(sid: any, callback: any) {
        try {
            await prisma.session.delete({
                where: { id: sid },
            });
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
}
declare module 'express-session' {
    export interface SessionData {
        user_id: number,
        token: string
    }
}

const app = express();


app.use(cors(
    {
        origin: '*',
        credentials: true
    }
));
app.use(cookieParser())
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(),
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}))
app.set("view engine", "ejs")
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer for handling multipart/form-data
const enrollmentUpload = multer();


app.use("/auth", Auth);
const authorize = require('./middleware/auth');
app.get('/get-session', authorize, (req: Request, res: Response) => {
    res.json(req.session.token);
});
app.get('/uploads/:name', (req: Request, res: Response) => {
    console.log(__dirname + '/uploads/' + req.params.name);
    res.sendFile(__dirname + '/uploads/' + req.params.name);
});
app.use("/user", User);
app.use('/test', Test)
app.use('/mcq', MCQ)
app.use('/attempt', Attempt)
app.use('/courses', Course)
app.use('/role', Role);
app.use('/perm', Permission);
app.use("/enrollment", Enrollment);
app.use("/forum", Forum);
app.use('/api/coupons', Coupons);

app.get("/sitemap.xml", async (req: Request, res: Response) => {
    res.sendFile(__dirname + '/public/sitemap.xml');
});
app.get("/robots.txt", async (req: Request, res: Response) => {
    res.sendFile(__dirname + '/public/robots.txt');
});
app.get('/test/:id', async (req: Request, res: Response) => {
    try {
        if (!req.params.id == null || req.params.id == undefined || req.params.id == '' || isNaN(Number(req.params.id)) || Number(req.params.id) < 1) {
            return res.render('404', { title: 'Page Not Found' });
        }
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                    coursesTaken:{
                        include:{
                            tests:{
                                include:{
                                    MCQ:true
                                }
                            }
                        }
                    }
                },
            });
        }

        const test = await prisma.test.findUnique({
            where: {
                id: Number(req.params.id),

            },
            include: {
                MCQ: true,
                Course: {
                    select: {
                        title: true
                    }
                }
            }
        });
        console.dir(test, { depth: null });
        if (!test) {
            return res.status(404).render("my-learnings", { user, message: "Sorry, this test isn't available right now.", courses: user?.coursesTaken });
        }
        console.dir(test, { depth: null });
        return res.render('test', { user, test });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }

}
);
app.post("/signin-redirection/:slug", async (req: any, res: any) => {
    try {
        const { slug } = req.params;
        const { email, password } = req.body;
        console.log(req.body);
        if (!email || !password) {
            res.status(400).render('sign-in', { message: 'Please fill all the fields', user: null });
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
            res.status(400).render('sign-in', { message: 'Invalid email or password', user: null });
            return;
        }
        const validPassword = await bcyrpt.compare(password, user.password);
        if (!validPassword) {
            res.status(400).render('sign-in', {message: 'Invalid email or password', user: null});
            return;
        }
        const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET || "JWT_SECRET");
        req.session.token = token;

        res.redirect(`/enroll/${slug}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }

});
app.get('/enroll/:slug', async (req: Request, res: Response) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },

                },
            });
        }
        if(!user){
            return res.render('sign-in', { message: 'Please sign in to enroll in a course', user: null });
        }
        const course = await prisma.course.findFirst({
            where: {
                slug: req.params.slug
            },
            include: {
                chapters: {
                    include: {
                        modules: true
                    }
                },
                reviews: true,
                instructors: true
            }
        });
        if (!course) {
            return res.status(404).render('404', { title: 'Page Not Found' });
        }
        res.render('enroll', { course, user, pb_key, countries });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// enroll

app.post('/enroll/', enrollmentUpload.none(), async (req: any, res: any) => {
    try {
        console.log('Enrollment request received');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Raw body sample:', req.body);
        const userToken = req.session?.token;
        const {
            courseId,
            firstName,
            lastName,
            businessEmail,
            companyName,
            jobTitle,
            workPhone,
            address,
            city,
            state,
            country,
            zipcode,
            comments,
            mode,
            billingFirstName,
            billingLastName,
            billingBusinessEmail,
            billingCompanyName,
            billingJobTitle,
            billingWorkPhone,
            billingCity,
            billingCountry,
            stateBilling,
            billingZipCode,
            addressCompanyName,
            billingApt,
            paymentMode,
            coursePrice,
            govermentPricing,
            courseName,
            couponCode,
            couponDiscount,
        } = req.body;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }
        if (!user) {
            return res.redirect('/sign-in');
        }
        
        // Validate required billing fields
        if (!billingFirstName || !billingLastName || !billingBusinessEmail) {
            console.log('Billing validation failed:', { billingFirstName, billingLastName, billingBusinessEmail });
            return res.status(400).json({ 
                message: 'Billing first name, last name, and business email are required',
                status: 400 
            });
        }
        
        const billing = await prisma.billing.create({
            data: {
                firstName: billingFirstName,
                lastName: billingLastName,
                businessEmail: billingBusinessEmail,
                companyName: billingCompanyName || '',
                jobTitle: billingJobTitle || '',
                workPhone: billingWorkPhone || '',
                address: addressCompanyName || '',
                city: billingCity || '',
                state: stateBilling || '',
                country: billingCountry || '',
                zipCode: billingZipCode || '',
            },
        });
        
        // Validate participant data
        if (!firstName || !Array.isArray(firstName) || firstName.length === 0) {
            return res.status(400).json({ 
                message: 'At least one participant is required',
                status: 400 
            });
        }
        
        const participantData = firstName.map((_: any, index: any) => ({
            firstName: firstName[index] || '',
            lastName: lastName[index] || '',
            businessEmail: businessEmail[index] || '',
            companyName: companyName[index] || '',
            jobTitle: jobTitle[index] || '',
            workPhone: workPhone[index] || '',
            address: address[index] || '',
            city: city[index] || '',
            state: state[index] || '',
            country: country[index] || '',
            zipCode: zipcode[index] || '',
            comments: comments[index] || '',
            isVirtual: mode[index] === 'virtual',
            isSelfPaced: mode[index] === 'self-paced',
        }));
        console.dir(participantData, { depth: null });
        const participants = await prisma.participant.createMany({
            data: participantData,
        });
        const createdParticipants = await prisma.participant.findMany({
            where: {
                businessEmail: { in: businessEmail },
            },
            select: { id: true },
        });
        participantData.forEach(async (participant: any, index: any) => {
            const password = "pdu@12345";
            const hashedPassword = await bcyrpt.hash(password, 10);
            await prisma.user.create({
                data: {
                    name: participant.firstName + " " + participant.lastName,
                    email: participant.businessEmail,
                    password: hashedPassword,
                    role: {
                        connectOrCreate: {
                            where: {
                                name: "student"
                            },
                            create: {
                                name: "student"
                            }
                        }
                    },
                   
                }
            }).then(() => {
                sendEmail(participant.businessEmail, "Course Enrollment", {
                    username: participant.firstName + " " + participant.lastName,
                    email: participant.businessEmail,
                    password: password,
                    enrollmentDate: new Date().toISOString().split('T')[0]
                }, false, false)
            }).catch((error) => {
                console.log(error);
            })
        })
        let effectiveSubtotal = parseFloat(coursePrice);
        let appliedCouponId: number | null = null;
        // If a coupon code was applied on the client, validate again to be safe
        if (couponCode) {
            const coupon = await prismaAny.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } });
            if (coupon && coupon.isActive) {
                const now = new Date();
                if ((!coupon.startsAt || now >= coupon.startsAt) && (!coupon.endsAt || now <= coupon.endsAt)) {
                    if (!coupon.minSubtotal || effectiveSubtotal >= coupon.minSubtotal) {
                        const discount = coupon.type === 'percentage' ? Math.round((effectiveSubtotal * coupon.value) * 100) / 100 : Math.min(coupon.value, effectiveSubtotal);
                        effectiveSubtotal = Math.max(0, Math.round((effectiveSubtotal - discount) * 100) / 100);
                        appliedCouponId = coupon.id;
                    }
                }
            }
        }

        const enrollment = await prisma.enrollment.create({
            data: {
                user: {
                    connect: { id: user.id },
                },
                course: {
                    connect: { id: Number(courseId) },
                },
                billing: {
                    connect: { id: billing.id },
                },
                paymentType: paymentMode == 'credit card'
                    ? 'credit card'
                    : paymentMode == 'delayed payment by invoice'
                        ? 'delayed payment by invoice'
                        : paymentMode == 'prepaid company voucher'
                            ? 'prepaid company voucher'
                            : 'credit card',
                subtotal: effectiveSubtotal,
                csaPrice: govermentPricing == "true" ? true : false,
            },
        });

        await prisma.participant.updateMany({
            where: {
                businessEmail: { in: businessEmail },
            },
            data: {
                enrollmentId: enrollment.id,
            },
        });
        // Record coupon redemption if applied
        if (appliedCouponId) {
            const discountAmount = Math.max(0, parseFloat(coursePrice) - effectiveSubtotal);
            await prismaAny.couponRedemption.create({
                data: {
                    couponId: appliedCouponId,
                    userId: user.id,
                    enrollmentId: enrollment.id,
                    amount: discountAmount,
                }
            });
        }

        if (paymentMode == 'credit card') {
            console.log('Credit card payment selected, returning checkout redirect');
            // Return JSON response to trigger frontend redirect to Stripe Checkout
            return res.json({ 
                redirectToCheckout: true, 
                enrollmentId: enrollment.id, 
                coursePrice: parseFloat(coursePrice) 
            });
        }
        res.render("invoice", { enrollment, participants, user, courseName });

    }
    catch (error: any) {
        console.error('Enrollment error:', error);
        res.status(500).json({ message: 'Internal server error', status: 500, error: error?.message || 'Unknown error' });
    }
}
);
import sendEmail from './helper/email';
import sendContactEmail from './helper/contact';
// Old /pay endpoint removed - replaced with Stripe Checkout flow
// payment
app.get('/my-learnings', async (req: Request, res: Response) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                    coursesTaken: {
                        include: {
                            chapters: {
                                include: {
                                    modules: true
                                }
                            },
                            reviews: true,
                            books: true,
                            resources: true,
                            tests: {
                                include: {
                                    MCQ: {
                                        select: {
                                            id: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            });
        }
        if (!user) {
            return res.redirect('/sign-in');
        }

        let courses = user.coursesTaken;

        // const tests = await prisma.test.findMany({
        //     where: {
        //         courseId: {
        //             in: courses.map(course => course.id)
        //         }
        //     },
        //     include:{
        //         MCQ:{
        //             select:{
        //                 id:true,
        //             }
        //         }
        //     }
        // });

        // courses = courses.map(course => ({
        //     ...course,
        //     test: tests.find(test => test.courseId === course.id)
        // }));

        console.dir(courses, { depth: null });
        res.render('my-learnings', { courses, user, message: req.query.message || "" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
}
);
// courses
app.get('/my-learnings/courses', async (req: Request, res: Response) => {
    res.redirect('/my-learnings');
});
// Updated eligibility check function
const checkEligibility = (attempts: any) => {
    if (!attempts || attempts.length === 0) {
        return false;
    }

    // Group attempts by test
    const testAttempts = attempts.reduce((acc: any, attempt: any) => {
        const testId = attempt.Test?.id;
        if (!acc[testId]) {
            acc[testId] = [];
        }
        acc[testId].push(attempt);
        return acc;
    }, {});

    // Get unique test IDs
    const testIds = Object.keys(testAttempts);

    // Check if user has passed all tests at least once
    const allTestsPassed = testIds.every((testId) => {
        // Check if any attempt for this test was passed
        return testAttempts[testId].some((attempt: any) => attempt.isPassed);
    });

    return allTestsPassed;
};

// Updated route handler
app.get('/my-learnings/courses/:slug/dashboard', async (req: Request, res: Response) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }

        // Fetch course with all related data
        const course = await prisma.course.findFirst({
            where: {
                slug: req.params.slug
            },
            include: {
                chapters: {
                    include: {
                        modules: true
                    }
                },
                reviews: {
                    include: {
                        student: true
                    }
                },
                instructors: true,
                tests: {
                    include: {
                        MCQ: true
                    }
                },
                books: true,
                resources: true
            }
        });

        if (!course) {
            return res.status(404).render('404', { title: 'Page Not Found' });
        }

        // Fetch user progress
        const progress = await prisma.userProgress.findMany({
            where: { 
                userId: user?.id, 
                courseId: course?.id 
            },
        });

        // Fetch all attempts for all tests in the course
        const attempts = await prisma.attempt.findMany({
            where: { 
                userId: user?.id, 
                Test: {
                    courseId: course?.id
                } 
            },
            include: {
                Test: true,
                categories: {
                    include: {
                        subCategories: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // Show newest attempts first
            }
        });

        // Group attempts by test for better organization
        const groupedAttempts = attempts.reduce((acc: any, attempt: any) => {
            const testId = attempt.Test?.id;
            if (!acc[testId]) {
                acc[testId] = [];
            }
            acc[testId].push(attempt);
            return acc;
        }, {});

        const isEligible = checkEligibility(attempts);

        // Calculate additional statistics for display
        const attemptStats = {
            totalAttempts: attempts.length,
            passedTests: new Set(attempts.filter(a => a.isPassed).map(a => a.Test?.id)).size,
            totalTests: new Set(attempts.map(a => a.Test?.id)).size,
            latestAttemptDate: attempts[0]?.createdAt
        };


        res.render('course-single', { 
            course, 
            user, 
            progress,
            message: "",
            attempts,
            groupedAttempts, // Add grouped attempts for easier template rendering
            attemptStats,    // Add statistics
            isEligible 
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});
app.get("/test", async (req: Request, res: Response) => {
    try {
       
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                    coursesTaken:{
                        include:{
                            tests:{
                                include:{
                                    MCQ:true
                                }
                            },
                            books:true,
                            resources:true
                        }
                    }
                },
            });
        }

        return res.status(404).render("my-learnings", { user, message: "Sorry, tests for this course aren't available right now.", courses: user?.coursesTaken });

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});
app.post("/api/make-attempt", async (req: any, res: any) => {
    try {
      const userToken = req.session?.token;
      let user = null;
  
      if (userToken) {
        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        user = await prisma.user.findUnique({
          where: { id: decodedToken.user_id },
          select: { id: true },
        });
      }
  
      const { isPassed, total, correct, testId, categories } = req.body;
  
      const attempt = await prisma.attempt.create({
        data: {
            isPassed,
            total,
            correct,
            Test:{
                connect:{
                    id:testId
                }
            },
            User:{
                connect:{
                    id:user?.id
                }
            },
            categories: {
                create: categories.map((category:any) => ({
                    name: category.name,
                    score: category.score,
                    subCategories: {
                        create: category.subCategories.map((subCat: any) => ({
                            name: subCat.name,
                            score: subCat.score,
                        }))
                    }
                }))
            }
        },
        include: {
            categories: {
                include: {
                    subCategories: true
                }
            }
        }
    });

    return res.json({ success: true, attempt });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error', status: 500 });
    }
  });
app.get('/my-learnings/courses/:slug', async (req: Request, res: Response) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }
        const course = await prisma.course.findFirst({
            where: {
                slug: req.params.slug
            },
            include: {
                chapters: {
                    include: {
                        modules: true
                    }
                },
                reviews: {
                    include: {
                        student: true
                    }
                },
                instructors: true
            }
        });
        if (!course) {
            return res.status(404).render('404', { title: 'Page Not Found' });
        }
        const progress = await prisma.userProgress.findMany({
            where: { userId: user?.id, courseId: course?.id },
        });
        res.render('course-player', { course, user, progress });

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
}
);
app.post('/review/courses/:slug', async (req: any, res: any) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }
        const course = await prisma.course.findFirst({
            where: {
                slug: req.params.slug
            },
            include: {
                chapters: {
                    include: {
                        modules: true
                    }
                },
                reviews: true,
                instructors: true
            }
        });
        if (!course) {
            return res.status(404).render('404', { title: 'Page Not Found' });
        }
        // If the user is not authenticated, redirect back to the course page with a message
        if (!user) {
            return res.redirect(`/courses/${course.slug}?message=${encodeURIComponent('Please sign in to submit a review.')}`);
        }
        const body = req.body;
        console.dir(body, { depth: null });
        // Normalize and validate rating as an integer 0-5 to satisfy Prisma schema
        const ratingNumber = Number(body?.rating2);
        const rating = Math.max(0, Math.min(5, Number.isFinite(ratingNumber) ? Math.round(ratingNumber) : 0));
        const review = await prisma.review.create({
            data: {
                rating,
                content: body.desc,
                course: {
                    connect: {
                        id: course.id
                    }
                },
                student: {
                    connect: {
                        id: user?.id
                    }
                }
            }
        });
        if (!review) {
            return res.status(400).json({ message: 'Review not created', status: 400 });
        }
        res.redirect(`/courses/${course.slug}`);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});
// view routes
app.get("/", async (req: Request, res: Response) => {
    try {
        
        const userToken = req.session?.token;
        console.log(userToken);
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }
        console.dir(user, { depth: null });

        // Fetch courses
        const courses = await prisma.course.findMany({
            take:3,
            include: {
                chapters: {
                    include: {
                        modules: true,
                    },
                },
                reviews: true,
            },
        })

        // Calculate total modules for each course
        const coursesWithModuleCounts = courses.map(course => {
            const totalModules = course.chapters.reduce((count, chapter) => count + chapter.modules.length, 0);
            return {
                ...course,
                totalModules,
            };
        });

        // Render the page with user details
        res.render('index', {
            courses: coursesWithModuleCounts,
            title: 'Home',
            message: 'Welcome to the home page.',
            user, // Pass user details to the page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/logout', async (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ message: 'Internal server error', status: 500 });
            return;
        }
        res.redirect('/');
    });
});
app.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            res.status(400).render('sign-up',{ message: 'Please fill all the fields', status: 400,user:null });
            return;
        }
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (user) {
            res.status(400).render('sign-up', { message: 'User already exists', status: 400, user: null });
            return;
        }
        const hashedPassword = await bcyrpt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: {
                    connectOrCreate: {
                        where: {
                            name: 'student'
                        },
                        create: {
                            name: 'student'
                        }
                    }

                }
            }
        });
        res.redirect('/sign-in');
    } catch (error) {
        console.error(error);
        res.status(500).render('sign-up', { message: 'Something went wrong please try again!', status: 500, user: null });
    }
});
app.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);
        if (!email || !password) {
            res.status(400).render('sign-in', { message: 'Please fill all the fields', user: null });
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
            res.status(400).render('sign-in', { message: 'Invalid email or password', user: null });
            return;
        }
        const validPassword = await bcyrpt.compare(password, user.password);
        if (!validPassword) {
            res.status(400).render('sign-in', {message: 'Invalid email or password', user: null});
            return;
        }
        const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET || "JWT_SECRET");
        req.session.token = token;

        res.redirect('/?reload=true');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});
app.get("/courses", async (req: Request, res: Response) => {
    const userToken = req.session?.token;
    let user = null;
    if (userToken) {
        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

        user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            select: {
                id: true,
                name: true,
                email: true,
                role: {
                    select: {
                        name: true,
                    },
                }
            },
        });
    }
    const courses = await prisma.course.findMany({
        include: {
            chapters: {
                include: {
                    modules: true
                }

            },

            reviews: true
        }
    });
    const coursesWithModuleCounts = courses.map(course => {
        const totalModules = course.chapters.reduce((count, chapter) => count + chapter.modules.length, 0);
        let averageRating = 0;

        if (course.reviews.length > 0) {
            averageRating =
                course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length;
        }

        console.log('Average Rating:', averageRating.toFixed(2));

        return {
            ...course,
            totalModules,
            averageRating: averageRating.toFixed(2),
        };
    });
    res.render('course', { courses: coursesWithModuleCounts, title: 'Home', message: 'Welcome to the home page.', user });
});
// Helper function to convert 24-hour time to 12-hour format
function formatTimeTo12Hour(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Helper function to format schedule days nicely
function formatScheduleDays(days: string[]): string {
    if (!days || days.length === 0) return '';
    
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    // Check for consecutive weekdays (Monday to Friday)
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const isConsecutiveWeekdays = weekdays.every(day => sortedDays.includes(day)) && sortedDays.length === 5;
    
    if (isConsecutiveWeekdays) {
        return 'Monday to Friday';
    }
    
    // Check for weekend
    const weekend = ['Saturday', 'Sunday'];
    const isWeekend = weekend.every(day => sortedDays.includes(day)) && sortedDays.length === 2;
    
    if (isWeekend) {
        return 'Saturday to Sunday';
    }
    
    // For other combinations, join with commas
    if (sortedDays.length <= 3) {
        return sortedDays.join(', ');
    } else {
        return `${sortedDays[0]} to ${sortedDays[sortedDays.length - 1]}`;
    }
}

// Helper function to create formatted schedule string
function formatCourseSchedule(course: any): string {
    if (!course.scheduleDays || !course.startTime || !course.endTime) {
        return 'Schedule not specified';
    }
    
    const formattedDays = formatScheduleDays(course.scheduleDays);
    const startTime12 = formatTimeTo12Hour(course.startTime);
    const endTime12 = formatTimeTo12Hour(course.endTime);
    const timezone = course.timezone || 'EST';
    
    let scheduleText = `${formattedDays}<br>(${startTime12} to ${endTime12}) ${timezone}`;
    
    // Add course dates if available
    if (course.startDate && course.endDate) {
        const startDate = new Date(course.startDate);
        const endDate = new Date(course.endDate);
        const formatOptions: Intl.DateTimeFormatOptions = { 
            month: 'short', 
            day: 'numeric' 
        };
        
        const formattedStartDate = startDate.toLocaleDateString('en-US', formatOptions);
        const formattedEndDate = endDate.toLocaleDateString('en-US', formatOptions);
        
        scheduleText = `${formattedStartDate} to ${formattedEndDate}<br>${formattedDays}<br>(${startTime12} to ${endTime12}) ${timezone}`;
    }
    
    return scheduleText;
}

app.get('/courses/:slug', async (req: Request, res: Response) => {
    const userToken = req.session?.token;
    let user = null;
    if (userToken) {
        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

        user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            select: {
                id: true,
                name: true,
                email: true,
                role: {
                    select: {
                        name: true,
                    },
                },
                coursesTaken: {
                    select: {
                        id: true,
                        slug: true,
                        title: true
                    }
                }
            },
        });
    }
    const course = await prisma.course.findFirst({
        where: {
            slug: req.params.slug
        },
        include: {
            chapters: {
                include: {
                    modules: true
                }
            },
            students: {
                select: {
                    name: true
                }
            },
            reviews: {
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            },
            instructors: true
        }
    });
    if (!course) {
        return res.status(404).render('404', { title: 'Page Not Found' });
    }
    let averageRating = 0;

    if (course.reviews.length > 0) {
        averageRating =
            course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length;
    }

    console.log('Average Rating:', averageRating.toFixed(2));
    const meta = {
        "pmp-exam-prep-extended-4-month-course":{
            title:"PMP Exam Prep – 4-Month Extended Course | PDU",
            description:"Need more time to prepare? PDUs 4-month extended PMP exam prep course offers in-depth training, real exam simulations, and flexible study plans."
        },
     "pmp-exam-prep-3-month-online-course":{
        title:"PMP 3-Month Exam Prep Course Online – PDU",
        description:"Get PMP certified in just 3 months with PDUs online prep course. Intensive learning, expert guidance, and full exam readiness—enroll now!"
    },
    "pmp-exam-prep-online-course":{
        title:"PMP Exam Prep Online Course – Get Certified with PDU",
        description:"Master the PMP exam with PDUs expert-led online course. Flexible, interactive, and designed for success—boost your career in project management today."
    }
    }
    res.render('course-details', { 
        course, 
        user, 
        averageRating: averageRating.toFixed(2),
        meta: meta[course?.slug as keyof typeof meta],
        message: req.query.message || '',
        formattedSchedule: formatCourseSchedule(course)
    });
});
app.post("/contact", async (req: any, res: any) => {
    try {
        const { name, email, message, phone } = req.body;
        if (!name || !email || !message || !phone) {
            return res.status(400).json({ message: 'Please fill all the fields', status: 400 });
        }
        await sendContactEmail(name, email, "Contact Admin", message + " Phone: " + phone);
        return res.redirect('/contact');
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
})
app.get('/forums', async (req: Request, res: Response) => {
    const userToken = req.session?.token;
    let user = null;
    
    if (userToken) {
        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            include: {
                coursesTaken: {
                    include: {
                        forums: {
                            select: {
                                id: true,
                                title: true,
                                isActive: true,
                                expiresAt: true,
                                createdAt: true,
                                _count: {
                                    select: {
                                        comments: true
                                    }
                                }
                            }
                        },
                        _count: {
                            select: {
                                forums: true
                            }
                        }
                    }
                }
            }
        });
    }
    
    if (!user) {
        return res.redirect('/sign-in');
    }
    
    res.render('forums', { title: 'Course Forums', user, courses: user.coursesTaken || [] });
});
app.get('/:page', async (req, res) => {
    const page = req.params.page;
    const validPages = [
        'the-best-way-to-prepare-for-the-pmp-certification',
        'about',
        'contact',
        'sign-in',
        'sign-up',
        'faqs',
        'privacy-policy',
        'refund-return-policy',
        'terms-of-service',
        'pmp-thoughts',
        'courses',
        "pmp-certification-exam-preparation-resources-by-pdu-expert",
        "pmp-exam-preparation-course-practical-guide-to-exam-success",
        "project-management-training-courses-35hrs-live-instruction-by-pdu",
        "a-dedicated-sponsor-and-mentor",
        "managing-deployed-teams",
        "risks-manifestations",
        "operational-planning",
        "strategic-leadership",
        "learn-from-your-mistakes",
        "workplace-productivity",
        "force-multiplication",
        "leveraging-knowledge-games",
        "command-level-communication",
        "how-we-hit-quality-goals",
        "mission-ready-collaboration",
        "the-warrior-scholar",
        "developing-creativity-in-education",
        "did-i-take-the-wrong-training-course",
        "adaptive-leadership",
        "leadership-team-supports-enduring-success",
        "feeding-the-force",
        "sharpen-academic-paper-military-approach",
        "bridging-blueprints-and-schedules",
        "complete-pmp-exam-preparation-guide-with-pdu-for-exam-success",
        "pmp-certification-requirements-complete-guide-for-exam",
        "pmp-mock-practice-exams-boost-your-exam-readiness-with-pdu",
        "pmp-exam-prep-3-month-study-plan-by-pdu-experts",
        "how-to-prepare-for-the-pmp-exam-in-4-months-with-pdu",
        "pmp-exam-preparation-course-proven-strategies-from-pdu",
        "3-month-pmp-exam-preparation-strategy-learn-with-pdu",
        "4-month-pmp-exam-prep-course-structured-guide-with-pdu",
        "pdus-pmp-mock-practice-exams-to-sharpen-your-skills",
        "pmp-exam-prep-course-complete-study-guide-by-pdu",
        "pmp-exam-prep-roadmap-mock-tests-and-courses-at-pdu",
        "master-pmp-exam-prep-in-3-or-4-months-with-pdu-guidance",
        "3-month-pmp-exam-prep-a-step-by-step-guide-to-exam-success",
        "articles",
    ];

    if (validPages.includes(page)) {
        const userToken = req.session?.token;
        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");

            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            name: true,
                        },
                    }
                },
            });
        }
        return res.render(page, { title: page.replace('-', ' '), user, message: "" });
    } else {
        return res.status(404).render('404', { title: 'Page Not Found' }); // Make sure you have a 404.ejs
    }
});

// Create a router for forum routes
const forumRouter = Router();

// Forum routes for course-single.ejs
forumRouter.get('/course/:courseId/forums', async (req, res) => {
    console.log('GET /api/course/:courseId/forums - Request received:', {
        params: req.params,
        query: req.query,
        headers: req.headers
    });
    try {
        const { courseId } = req.params;
        const userToken = req.session?.token;
        console.log('Processing forum list request:', { courseId, hasUserToken: !!userToken });

        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
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
            console.log('User found:', { userId: user?.id, role: user?.role?.name });
        }

        const forums = await prisma.forum.findMany({
            where: {
                courseId: parseInt(courseId)
            },
            include: {
                _count: {
                    select: {
                        comments: true
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        cohort: true
                    }
                },
                lastActivityUser: {
                    select: {
                        id: true,
                        name: true,
                        cohort: true
                    }
                }
            },
            orderBy: [
                { lastActivityAt: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        console.log('Forums found:', { count: forums.length });
        res.json({ forums, user });
    } catch (error) {
        console.error('Error in GET /api/course/:courseId/forums:', error);
        console.error('Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
            params: req.params
        });
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.get('/forum/:forumId/details', async (req:any, res:any) => {
    console.log('GET /api/forum/:forumId/details - Request received:', {
        params: req.params,
        query: req.query,
        headers: req.headers
    });
    try {
        const { forumId } = req.params;
        const userToken = req.session?.token;
        console.log('Processing forum details request:', { forumId, hasUserToken: !!userToken });

        let user = null;
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
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
            console.log('User found:', { userId: user?.id, role: user?.role?.name });
        }

        // Increment view count
        console.log('Incrementing view count for forum:', forumId);
        await prisma.forum.update({
            where: { id: parseInt(forumId) },
            data: { viewCount: { increment: 1 } }
        });

        const forum = await prisma.forum.findUnique({
            where: { id: parseInt(forumId) },
            include: {
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                cohort: true
                            }
                        },
                        replies: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        cohort: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        },
                        lastActivityUser: {
                            select: {
                                id: true,
                                name: true,
                                cohort: true
                            }
                        }
                    },
                    orderBy: [
                        { lastActivityAt: 'desc' },
                        { createdAt: 'desc' }
                    ]
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        cohort: true
                    }
                },
                lastActivityUser: {
                    select: {
                        id: true,
                        name: true,
                        cohort: true
                    }
                }
            }
        });

        if (!forum) {
            console.log('Forum not found:', forumId);
            return res.status(404).json({ message: 'Forum not found', status: 404 });
        }

        console.log('Forum details retrieved:', {
            forumId: forum.id,
            title: forum.title,
            commentCount: forum.comments.length
        });

        res.json({ forum, user });
    } catch (error) {
        console.error('Error in GET /api/forum/:forumId/details:', error);
        console.error('Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
            params: req.params
        });
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.post('/forum/:forumId/comment', async (req:any, res:any) => {
    try {
        const { forumId } = req.params;
        const { content } = req.body;
        const userToken = req.session?.token;

        if (!userToken) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found', status: 401 });
        }

        // Check if forum exists and is active
        const forum = await prisma.forum.findUnique({
            where: { id: parseInt(forumId) }
        });

        if (!forum) {
            return res.status(404).json({ message: 'Forum not found', status: 404 });
        }

        if (!forum.isActive) {
            return res.status(403).json({ message: 'This forum is no longer active', status: 403 });
        }

        if (forum.expiresAt && new Date() > forum.expiresAt) {
            return res.status(403).json({ message: 'This forum has expired', status: 403 });
        }

        const comment = await prisma.forumComment.create({
            data: {
                content,
                user: { connect: { id: user.id } },
                forum: { connect: { id: parseInt(forumId) } }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        cohort: true
                    }
                }
            }
        });

        // Update forum's last activity
        await prisma.forum.update({
            where: { id: parseInt(forumId) },
            data: {
                lastActivityAt: new Date(),
                lastActivityBy: user.id
            }
        });

        res.json({ comment, user });
    } catch (error) {
        console.error((error as Error).message);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.post('/forum/:forumId/comment/:commentId/reply', async (req:any, res:any) => {
    try {
        const { forumId, commentId } = req.params;
        const { content } = req.body;
        const userToken = req.session?.token;

        if (!userToken) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found', status: 401 });
        }

        // Check if comment exists and forum is active
        const comment = await prisma.forumComment.findUnique({
            where: { id: parseInt(commentId) },
            include: { forum: true }
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found', status: 404 });
        }

        if (!comment.forum.isActive) {
            return res.status(403).json({ message: 'This forum is no longer active', status: 403 });
        }

        if (comment.forum.expiresAt && new Date() > comment.forum.expiresAt) {
            return res.status(403).json({ message: 'This forum has expired', status: 403 });
        }

        const reply = await prisma.forumReply.create({
            data: {
                content,
                user: { connect: { id: user.id } },
                forumComment: { connect: { id: parseInt(commentId) } }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        cohort: true
                    }
                }
            }
        });

        // Update forum's last activity
        await prisma.forum.update({
            where: { id: parseInt(forumId) },
            data: {
                lastActivityAt: new Date(),
                lastActivityBy: user.id
            }
        });

        res.json({ reply, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.post('/forum/create', async (req:any, res:any) => {
    try {
        const { title, description, courseId, autoExpireAfter } = req.body;
        const userToken = req.session?.token;

        if (!userToken) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found', status: 401 });
        }

        if (!title || !description || !courseId) {
            return res.status(400).json({ message: 'Missing required fields', status: 400 });
        }

        // Calculate expiration date if provided
        let expiresAt = null;
        if (autoExpireAfter) {
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + parseInt(autoExpireAfter));
        }

        const forum = await prisma.forum.create({
            data: {
                title,
                description,
                expiresAt,
                autoExpireAfter: autoExpireAfter ? parseInt(autoExpireAfter) : null,
                course: { connect: { id: parseInt(courseId) } },
                createdBy: { connect: { id: user.id } }
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        cohort: true
                    }
                }
            }
        });

        res.json({ forum, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.delete('/forum/:forumId', async (req:any, res:any) => {
    try {
        const { forumId } = req.params;
        const userToken = req.session?.token;

        if (!userToken) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found', status: 401 });
        }

        // Check if user is admin or forum creator
        const forum = await prisma.forum.findUnique({
            where: { id: parseInt(forumId) },
            select: { createdById: true }
        });

        if (!forum) {
            return res.status(404).json({ message: 'Forum not found', status: 404 });
        }

        const isAdmin = user.role?.permissions.some(p => p.name === 'Manage Forums');
        const isCreator = forum.createdById === user.id;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: 'Forbidden', status: 403 });
        }

        // Delete the forum and all its comments and replies
        await prisma.$transaction([
            prisma.forumReply.deleteMany({
                where: {
                    forumComment: {
                        forumId: parseInt(forumId)
                    }
                }
            }),
            prisma.forumComment.deleteMany({
                where: {
                    forumId: parseInt(forumId)
                }
            }),
            prisma.forum.delete({
                where: {
                    id: parseInt(forumId)
                }
            })
        ]);

        res.json({ message: 'Forum deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

forumRouter.patch('/forum/:forumId/submission-date', async (req:any, res:any    ) => {
    try {
        const { forumId } = req.params;
        const { createdAt } = req.body;
        const userToken = req.session?.token;

        if (!userToken) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found', status: 401 });
        }

        const hasPermission = user.role?.permissions.some(p => p.name === 'Manage Forums');
        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden - Admin access required', status: 403 });
        }

        const forum = await prisma.forum.update({
            where: {
                id: parseInt(forumId)
            },
            data: {
                createdAt: new Date(createdAt)
            }
        });

        res.json({ forum, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Mount the forum router under /api prefix
app.use('/api', forumRouter);

// Current user info for client-side scripts
app.get('/api/user/me', async (req: any, res: any) => {
    try {
        const userToken = req.session?.token;
        if (!userToken) {
            return res.status(200).json({ user: null });
        }
        const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.user_id },
            select: {
                id: true,
                name: true,
                email: true,
                cohort: true,
                role: {
                    select: {
                        name: true,
                        permissions: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error in GET /api/user/me:', error);
        return res.status(200).json({ user: null });
    }
});

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req: any, res: any) => {
    try {
        const userToken = req.session?.token;
        let user = null;
        
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });
        }

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized', status: 401 });
        }

        const { enrollmentId } = req.body;
        
        if (!enrollmentId) {
            return res.status(400).json({ message: 'Enrollment ID is required', status: 400 });
        }

        const enrollment = await prisma.enrollment.findFirst({
            where: { id: Number(enrollmentId) },
            include: {
                course: true,
                billing: true,
                participants: true
            }
        });

        if (!enrollment || !enrollment.course) {
            return res.status(404).json({ message: 'Enrollment or course not found', status: 404 });
        }

        // Create Stripe customer if doesn't exist
        let customer;
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });

        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: enrollment.course.title,
                            description: `Course enrollment for ${enrollment.course.title}`,
                        },
                        unit_amount: Math.round(enrollment.subtotal * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/invoice/${enrollmentId}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/payment-cancelled?enrollment_id=${enrollmentId}`,
            metadata: {
                enrollmentId: enrollmentId.toString(),
                userId: user.id.toString(),
                courseId: enrollment.course.id.toString(),
            },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Removed payment-success handler - now handled directly in invoice route

// Invoice page handler
app.get('/invoice/:enrollmentId', async (req: Request, res: Response) => {
    try {
        const { enrollmentId } = req.params;
        const { session_id } = req.query;
        
        // Get user from session
        const userToken = req.session?.token;
        let user = null;
        
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });
        }

        if (!user) {
            return res.redirect('/sign-in');
        }

        // Get enrollment details
        let enrollment = await prisma.enrollment.findFirst({
            where: { id: Number(enrollmentId) },
            include: {
                participants: true,
                billing: true,
                course: true
            }
        });

        if (!enrollment) {
            return res.redirect('/my-learnings?message=Enrollment not found');
        }

        // If there's a session_id, this is coming from Stripe success - process the payment
        if (session_id && enrollment && enrollment.status !== 'paid') {
            try {
                // Verify the session with Stripe
                const stripeSession = await stripe.checkout.sessions.retrieve(session_id as string);
                
                if (stripeSession.payment_status === 'paid') {
                    // Update enrollment status
                    enrollment = await prisma.enrollment.update({
                        where: { id: Number(enrollmentId) },
                        data: { status: 'paid' },
                        include: {
                            participants: true,
                            billing: true,
                            course: true
                        }
                    });

                    // Enroll participants in the course
                    if (enrollment.participants && enrollment.course) {
                        const courseId = enrollment.course.id;
                        await Promise.all(
                            enrollment.participants.map(async (participant) => {
                                await prisma.user.update({
                                    where: { email: participant.businessEmail },
                                    data: {
                                        coursesTaken: {
                                            connect: { id: courseId }
                                        }
                                    }
                                });
                            })
                        );
                    }

                    // Send confirmation emails
                    if (enrollment.course && user) {
                        const placeholders = {
                            username: user.name,
                            courseName: enrollment.course.title,
                            enrollmentDate: new Date().toLocaleDateString(),
                            coursePrice: enrollment.subtotal,
                            paymentMethod: 'Credit Card',
                        };

                        if (enrollment.billing?.businessEmail) {
                            await sendEmail(enrollment.billing.businessEmail, 'Enrollment Confirmation', placeholders, true, false);
                        }
                        await sendEmail(user.email, 'Enrollment Confirmation', placeholders, true, false);
                    }
                }
            } catch (stripeError) {
                console.error('Error processing Stripe payment:', stripeError);
                // Continue to show invoice even if payment processing fails
            }
        }

        // Verify user owns this enrollment or is enrolled in it
        const userHasAccess = enrollment.userId === user.id || 
                             enrollment.participants.some(p => p.businessEmail === user.email);

        if (!userHasAccess) {
            return res.redirect('/my-learnings?message=Access denied');
        }

        // Render invoice page
        res.render("invoice", { 
            enrollment, 
            user, 
            courseName: enrollment.course?.title,
            participants: enrollment.participants 
        });

    } catch (error) {
        console.error('Error loading invoice:', error);
        res.redirect('/my-learnings?message=Error loading invoice');
    }
});

// Payment Cancelled Handler
app.get('/payment-cancelled', async (req: Request, res: Response) => {
    try {
        const { enrollment_id } = req.query;
        
        // Get user from session
        const userToken = req.session?.token;
        let user = null;
        
        if (userToken) {
            const decodedToken: any = jwt.verify(userToken, process.env.JWT_SECRET || "JWT_SECRET");
            user = await prisma.user.findUnique({
                where: { id: decodedToken.user_id },
            });
        }

        if (enrollment_id) {
            // Get enrollment details to get course info
            const enrollment = await prisma.enrollment.findFirst({
                where: { id: Number(enrollment_id) },
                include: { course: true }
            });

            if (enrollment?.course) {
                return res.redirect(`/courses/${enrollment.course.slug}?message=Payment was cancelled. Please try again.`);
            }
        }

        // Fallback redirect
        res.redirect('/my-learnings?message=Payment was cancelled');
    } catch (error) {
        console.error('Error handling payment cancellation:', error);
        res.redirect('/my-learnings?message=Payment was cancelled');
    }
});

http.createServer(app).listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
