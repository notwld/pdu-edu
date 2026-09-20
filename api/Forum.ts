import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Get all forums for a course
router.get('/course/:courseId', async (req: any, res: any) => {
    try {
        const { courseId } = req.params;
        
        const forums = await prisma.forum.findMany({
            where: {
                courseId: parseInt(courseId),
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
        
        return res.status(200).json(forums);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Get a specific forum with comments and replies
router.get('/:forumId', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        
        // Increment view count
        await prisma.forum.update({
            where: { id: parseInt(forumId) },
            data: { viewCount: { increment: 1 } }
        });
        
        const forum = await prisma.forum.findUnique({
            where: {
                id: parseInt(forumId),
            },
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
                course: {
                    select: {
                        title: true,
                        slug: true
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
            }
        });
        
        if (!forum) {
            return res.status(404).json({ message: 'Forum not found', status: 404 });
        }
        
        return res.status(200).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Create a new forum
router.post('/', async (req: any, res: any) => {
    try {
        const { title, description, courseId, autoExpireAfter } = req.body;
        
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
                course: {
                    connect: { id: parseInt(courseId) }
                }
            }
        });
        
        return res.status(201).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Update forum status (active/inactive)
router.patch('/:forumId/status', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        const { isActive } = req.body;
        
        const forum = await prisma.forum.update({
            where: {
                id: parseInt(forumId)
            },
            data: {
                isActive: isActive
            }
        });
        
        return res.status(200).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Update forum expiration time
router.patch('/:forumId/expiration', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        const { expiresIn } = req.body;
        
        // Calculate new expiration date
        let expiresAt = null;
        if (expiresIn) {
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
        }
        
        const forum = await prisma.forum.update({
            where: {
                id: parseInt(forumId)
            },
            data: {
                expiresAt
            }
        });
        
        return res.status(200).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Add a comment to a forum
router.post('/:forumId/comment', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        const { content, userId } = req.body;
        
        if (!content || !userId) {
            return res.status(400).json({ message: 'Comment content and user ID are required', status: 400 });
        }
        
        // Check if forum exists and is active
        const forum = await prisma.forum.findUnique({
            where: {
                id: parseInt(forumId)
            }
        });
        
        if (!forum) {
            return res.status(404).json({ message: 'Forum not found', status: 404 });
        }
        
        if (!forum.isActive) {
            return res.status(403).json({ message: 'This forum is no longer active', status: 403 });
        }
        
        // Check if forum is expired
        if (forum.expiresAt && new Date() > forum.expiresAt) {
            return res.status(403).json({ message: 'This forum has expired', status: 403 });
        }
        
        const comment = await prisma.forumComment.create({
            data: {
                content,
                user: {
                    connect: { id: parseInt(userId) }
                },
                forum: {
                    connect: { id: parseInt(forumId) }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        return res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Add a reply to a comment
router.post('/comment/:commentId/reply', async (req: any, res: any) => {
    try {
        const { commentId } = req.params;
        const { content, userId } = req.body;
        
        if (!content || !userId) {
            return res.status(400).json({ message: 'Reply content and user ID are required', status: 400 });
        }
        
        // Check if comment exists and forum is active
        const comment = await prisma.forumComment.findUnique({
            where: {
                id: parseInt(commentId)
            },
            include: {
                forum: true
            }
        });
        
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found', status: 404 });
        }
        
        if (!comment.forum.isActive) {
            return res.status(403).json({ message: 'This forum is no longer active', status: 403 });
        }
        
        // Check if forum is expired
        if (comment.forum.expiresAt && new Date() > comment.forum.expiresAt) {
            return res.status(403).json({ message: 'This forum has expired', status: 403 });
        }
        
        const reply = await prisma.forumReply.create({
            data: {
                content,
                user: {
                    connect: { id: parseInt(userId) }
                },
                forumComment: {
                    connect: { id: parseInt(commentId) }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        return res.status(201).json(reply);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Delete a forum
router.delete('/:forumId', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        
        // Delete the forum and all its comments and replies
        await prisma.$transaction([
            // Delete all replies first
            prisma.forumReply.deleteMany({
                where: {
                    forumComment: {
                        forumId: parseInt(forumId)
                    }
                }
            }),
            // Delete all comments
            prisma.forumComment.deleteMany({
                where: {
                    forumId: parseInt(forumId)
                }
            }),
            // Delete the forum
            prisma.forum.delete({
                where: {
                    id: parseInt(forumId)
                }
            })
        ]);
        
        return res.status(200).json({ message: 'Forum deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Add new endpoint to track forum views
router.post('/:forumId/view', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        
        const forum = await prisma.forum.update({
            where: {
                id: parseInt(forumId)
            },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });
        
        return res.status(200).json({ viewCount: forum.viewCount });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Add endpoint to update last activity
router.patch('/:forumId/activity', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        const { userId } = req.body;
        
        const forum = await prisma.forum.update({
            where: {
                id: parseInt(forumId)
            },
            data: {
                lastActivityAt: new Date(),
                lastActivityBy: parseInt(userId)
            }
        });
        
        return res.status(200).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

// Add endpoint for admin to update submission date
router.patch('/:forumId/submission-date', async (req: any, res: any) => {
    try {
        const { forumId } = req.params;
        const { createdAt } = req.body;
        
        // Check if user has admin permissions
        const userToken = req.headers['x-access-token'];
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
        
        const hasPermission = user?.role?.permissions.some(p => p.name === 'Manage Forums');
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
        
        return res.status(200).json(forum);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});

export default router; 